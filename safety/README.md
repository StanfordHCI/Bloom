# Safety & Redteaming Evaluation

This directory contains the artifacts related to the safety and redteaming evaluation of Bloom. It includes the safety taxonomy, benchmark datasets, evaluation scripts, and aggregated results. Please refer to our paper for full details on the evaluation.

## Licensing
All prompts in [`backend/llm/prompts`](backend/llm/prompts) and [`safety/taxonomy.pdf`](safety/taxonomy.pdf) are © 2025 Board of Trustees of the Leland Stanford Junior University. Use requires prior written approval from the Stanford HEARTS Lab Faculty Director. See [`LICENSES/LicenseRef-ActiveChoices.txt`](LICENSES/LicenseRef-ActiveChoices.txt) for details.

## Disclaimer
Our safety taxonomy and benchmark dataset are provided for research and educational purposes only. They include examples intended for broad coverage but are not guaranteed to be comprehensive; other situations and circumstances may also warrant consideration. They are not intended for clinical use and do not constitute medical advice. Although the taxonomy is © Stanford University, it is not a part of the Active Choices program, nor should it be understood as a product or service of Stanford University. 

## Structure
- `taxonomy.pdf`: The safety taxonomy document outlining categories of unsafe outputs.
- `data/`: Directory containing benchmark datasets as csv files. Each file contains example user inputs and model outputs, along with a harmfulness label based on the taxonomy.
- `results/`: Results for reproducing the safety evaluation reported in our paper

After installing the necessary Python packages and setting an OpenAI API key in the `.env` files (following instructions in [`README.md`](README.md)), you can run 
- `python safety/run_classification_eval.py` to evaluate our classification prompts.
- `python safety/run_revision_eval.py` to evaluate our revision prompts.

The `aggregate_stats.py` script can be used to aggregate results from multiple runs into a single CSV file. Each `results/{mode}/{dataset}` directory contains multiple CSV files with results from each run and a `summary_stats.csv` file with aggregated results that are reported in our paper.