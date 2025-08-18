# helmgen (starter)

A minimal Click-based Python CLI to generate opinionated Helm charts from a single YAML spec (`app.yaml`).

## Quickstart

1) Create & activate a virtual environment
```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

2) Install dependencies
```bash
pip install click jinja2 pyyaml
```

3) Generate a chart
```bash
python cli.py create --file app.yaml
```

The chart will be created under `charts/<name>`.

4) (Optional) Lint the chart (requires Helm installed)
```bash
helm lint charts/<name>
```

5) (Optional) Package & push via your dbops pipeline as you already do.
