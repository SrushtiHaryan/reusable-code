import sys
import click
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import yaml

BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "charts"

def deep_merge(a, b):
    """
    Recursively merge dict b into dict a and return a new dict.
    Values in b override those in a.
    """
    result = dict(a)
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result

def load_defaults():
    config_path = BASE_DIR / "config.yaml"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            if not isinstance(data, dict):
                raise click.ClickException("config.yaml must be a YAML mapping/object")
            return data
    return {}

def render_template(env, template_name, context, output_path):
    template = env.get_template(template_name)
    content = template.render(context)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

@click.group()
def cli():
    """Helm Chart Generator CLI (Click-based)."""
    pass

@cli.command()
@click.option("--file", "file_path", type=click.Path(exists=True), required=True,
              help="YAML spec file describing the app (e.g., app.yaml)")
def create(file_path):
    """
    Generate a new Helm chart from an app spec file.
    """
    # Jinja environment
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    # Load org defaults
    defaults = load_defaults()

    # Load app spec
    with open(file_path, "r", encoding="utf-8") as f:
        app_spec = yaml.safe_load(f) or {}
        if not isinstance(app_spec, dict):
            raise click.ClickException("The app spec must be a YAML mapping/object")

    # Merge and set sane defaults
    ctx = deep_merge(defaults, app_spec)

    # Basic validation / defaults
    name = ctx.get("name")
    if not name:
        raise click.ClickException("Missing required field: 'name' in the app spec")
    ctx.setdefault("replicas", 1)
    ctx.setdefault("port", 8080)
    ctx.setdefault("image", "nginx:latest")
    ctx.setdefault("imagePullPolicy", "IfNotPresent")
    ctx.setdefault("labels", {})
    ctx.setdefault("resources", {
        "requests": {"cpu": "100m", "memory": "128Mi"},
        "limits": {"cpu": "500m", "memory": "512Mi"},
    })
    ctx.setdefault("ingress", {"enabled": False, "className": "", "host": ""})

    chart_dir = OUTPUT_DIR / name
    tmpl_dir = chart_dir / "templates"
    tmpl_dir.mkdir(parents=True, exist_ok=True)

    # Render files
    render_template(env, "Chart.yaml.j2", ctx, chart_dir / "Chart.yaml")
    render_template(env, "values.yaml.j2", ctx, chart_dir / "values.yaml")
    render_template(env, "deployment.yaml.j2", ctx, tmpl_dir / "deployment.yaml")
    render_template(env, "service.yaml.j2", ctx, tmpl_dir / "service.yaml")
    render_template(env, "ingress.yaml.j2", ctx, tmpl_dir / "ingress.yaml")

    click.secho(f"✅ Helm chart created at {chart_dir}", fg="green")

if __name__ == "__main__":
    cli()
