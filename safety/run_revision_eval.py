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
RESULTS_DIR = './safety/results/revision/test_corrected'
N_RUNS = 10

os.makedirs(RESULTS_DIR, exist_ok=True)

df = pd.read_csv(os.path.join(DATA_DIR, DATASET_FILE))
df = df[(df['output_harmful'] == 'UNSAFE') & (~df['is_few_shot'])].reset_index(drop=True)
print(f"{DATASET_FILE} harmful rows: {len(df)}")

# For testing
# df = df.sample(n=3).reset_index(drop=True)

async def parse_stream(streaming_generator):
    tokens = []
    async for chunk in streaming_generator:
        tokens.append(chunk.content if hasattr(chunk, 'content') else str(chunk))
    return ''.join(tokens)

for run_idx in range(N_RUNS):
    print(f"\nRun {run_idx + 1}/{N_RUNS}")
    out_csv = os.path.join(RESULTS_DIR, f'result_{run_idx}.csv')
    with open(out_csv, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        header = [
            'input_text', 'output_text', 'revised_text', 'category',
            *[f'post_revision_harmful_{c}' for c in range(1, 6)],
            *[f'rationale_{c}' for c in range(1, 6)],
        ]
        writer.writerow(header)

        post_revision_harmful_by_category = np.zeros(5, int)
        total_by_category = np.zeros(5, int)
        overall_total = len(df)
        overall_post_revision_harmful = 0

        for i in tqdm(range(len(df)), leave=False):
            row = df.iloc[i]

            history = []
            rationale = 'Rationale not provided'
            revised: str
            revised = loop.run_until_complete(
                parse_stream(
                    safety_module.revise_harmful_message(
                        row['input_text'], row['output_text'], history, str(int(row['category'])), rationale
                    )
                )
            )

            preds: List[bool]
            rationals: List[str]
            preds, rationals = loop.run_until_complete(
                safety_module.classify_harmfulness_independent(row['input_text'], revised)
            )
            preds_bool = [bool(p) for p in preds]
            
            line = [
                row['input_text'].replace('\n', ' ').replace(',', ' '),
                row['output_text'].replace('\n', ' ').replace(',', ' '),
                revised.replace('\n', ' ').replace(',', ' '),
                int(row['category']),
                *[int(p) for p in preds_bool],
                *[r.replace('\n', ' ').replace(',', ' ') for r in rationals],
            ]
            writer.writerow([str(x) for x in line])

            cat_idx = int(row['category']) - 1
            total_by_category[cat_idx] += 1
            if preds_bool[cat_idx]:
                post_revision_harmful_by_category[cat_idx] += 1

            if any(preds_bool):
                overall_post_revision_harmful += 1

    print("\nPost-Revision Harmfulness")
    for c in range(5):
        pct = post_revision_harmful_by_category[c] / total_by_category[c] * 100 if total_by_category[c] else np.nan
        print(f"Category {c+1} ({CATEGORY_FLAGS[c+1]}):\t{pct:.3f}%")
    overall_pct = overall_post_revision_harmful / overall_total * 100 if overall_total else np.nan
    print(f"Overall\t\t\t\t{overall_pct:.3f}%\n")
