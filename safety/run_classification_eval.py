import os
import sys
import csv
import asyncio
from typing import List

import pandas as pd
import numpy as np
from tqdm import tqdm

os.environ['APP_ENV'] = 'local'
os.environ['ENV_FILE'] = '.env.local'

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.modules.safety_module import SafetyModule  # type: ignore

safety_module = SafetyModule()
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

CATEGORY_FLAGS = {
    1: "bodily_harm",
    2: "body_image",
    3: "mental_health",
    4: "negative_mindset",
    5: "out_of_scope",
}

DATA_DIR = './safety/data'
DATASET_FILE = 'test_corrected.csv'
RESULTS_DIR = './safety/results/classification/test_corrected'
N_RUNS = 10

os.makedirs(RESULTS_DIR, exist_ok=True)

df = pd.read_csv(os.path.join(DATA_DIR, DATASET_FILE))
df = df[~df['is_few_shot']].reset_index(drop=True)

# For testing
# df = df.sample(n=10).reset_index(drop=True)

print(f"{DATASET_FILE}: {len(df)} rows")

true_harmfulness_category = df['category'].astype(int).to_numpy()
true_harmfulness_label = (df['output_harmful'] == 'UNSAFE').to_numpy()

def compute_metrics(tp: int, fp: int, fn: int, tn: int):
    pr = tp / (tp + fp) if (tp + fp) else np.nan
    re = tp / (tp + fn) if (tp + fn) else np.nan
    f1 = 2 * pr * re / (pr + re) if (pr + re) else np.nan
    acc = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) else np.nan
    return acc, pr, re, f1

for run_idx in range(N_RUNS):
    print(f"\nRun {run_idx + 1}/{N_RUNS}")
    out_csv = os.path.join(RESULTS_DIR, f'result_{run_idx}.csv')
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        header = [
            'input_text', 'output_text', 'category',
            *[f'pred_harmful_{c}' for c in range(1, 6)],
            *[f'true_harmful_{c}' for c in range(1, 6)],
            *[f'rationale_{c}' for c in range(1, 6)],
        ]
        writer.writerow(header)

        # Metric accumulators
        tp_by_category = np.zeros(5, int)
        fp_by_category = np.zeros(5, int)
        fn_by_category = np.zeros(5, int)
        tn_by_category = np.zeros(5, int)

        tp_strict = fp_strict = fn_strict = tn_strict = 0
        tp_relaxed = fp_relaxed = fn_relaxed = tn_relaxed = 0

        for i in tqdm(range(len(df)), leave=False):
            row = df.iloc[i]
            preds: List[bool]
            rationales: List[str]
            preds, rationales = loop.run_until_complete(
                safety_module.classify_harmfulness_independent(
                    row['input_text'], row['output_text']
                )
            )
            preds_bool = [bool(p) for p in preds]

            # Write CSV line
            true_labels = [1 if (true_harmfulness_label[i] and true_harmfulness_category[i] == c) else 0 for c in range(1, 6)]
            line = [
                row['input_text'].replace('\n', ' ').replace(',', ' '),
                row['output_text'].replace('\n', ' ').replace(',', ' '),
                int(row['category']),
                *[int(p) for p in preds_bool],
                *true_labels,
                *[r.replace('\n', ' ').replace(',', ' ') for r in rationales],
            ]
            writer.writerow([str(x) for x in line])

            c_idx = true_harmfulness_category[i] - 1
            pred = preds_bool[c_idx]  # category is 1-indexed
            true = bool(true_harmfulness_label[i])
            if pred and true:
                tp_by_category[c_idx] += 1
            elif pred and not true:
                fp_by_category[c_idx] += 1
            elif not pred and true:
                fn_by_category[c_idx] += 1
            else:
                tn_by_category[c_idx] += 1

            if true_harmfulness_label[i]:
                true_idx = true_harmfulness_category[i] - 1
                if preds_bool[true_idx]:
                    tp_strict += 1
                else:
                    fn_strict += 1
            else:
                if any(preds_bool):
                    fp_strict += 1
                else:
                    tn_strict += 1

            pred_any = any(preds_bool)
            if true_harmfulness_label[i] and pred_any:
                tp_relaxed += 1
            elif not true_harmfulness_label[i] and pred_any:
                fp_relaxed += 1
            elif true_harmfulness_label[i] and not pred_any:
                fn_relaxed += 1
            else:
                tn_relaxed += 1

    for c in range(5):
        acc, pr, re, f1 = compute_metrics(
            tp_by_category[c],
            fp_by_category[c],
            fn_by_category[c],
            tn_by_category[c]
        )
        print(f"Category {c+1} ({CATEGORY_FLAGS[c+1]}):\tACC: {acc:.3f}\tPR: {pr:.3f}\tRE: {re:.3f}\tF1: {f1:.3f}")

    s_acc, s_pr, s_re, s_f1 = compute_metrics(tp_strict, fp_strict, fn_strict, tn_strict)
    print(f"\nStrict overall:\t\t\tACC: {s_acc:.3f}\tPR: {s_pr:.3f}\tRE: {s_re:.3f}\tF1: {s_f1:.3f}")

    r_acc, r_pr, r_re, r_f1 = compute_metrics(tp_relaxed, fp_relaxed, fn_relaxed, tn_relaxed)
    print(f"Relaxed overall:\t\tACC: {r_acc:.3f}\tPR: {r_pr:.3f}\tRE: {r_re:.3f}\tF1: {r_f1:.3f}")
