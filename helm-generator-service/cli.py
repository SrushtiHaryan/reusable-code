# import os
# import json
# import click
# import jinja2
# import jsonschema
# from jsonschema import validate

# # Paths
# BASE_DIR = os.path.dirname(__file__)
# TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
# SCHEMA_FILE = os.path.join(BASE_DIR, "schema", "service-schema.json")

# # Load schema once
# with open(SCHEMA_FILE) as f:
#     SCHEMA = json.load(f)

# # Setup Jinja2
# env = jinja2.Environment(
#     loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
#     trim_blocks=True,
#     lstrip_blocks=True
# )


# def validate_spec(spec: dict):
#     """Validate JSON spec against schema"""
#     try:
#         validate(instance=spec, schema=SCHEMA)
#         return True
#     except jsonschema.exceptions.ValidationError as e:
#         raise click.ClickException(f"Invalid spec: {e.message}")


# def render_template(template_name: str, context: dict) -> str:
#     """Render Jinja2 template with context"""
#     template = env.get_template(template_name)
#     return template.render(**context)


# @click.command()
# @click.option("--spec", required=True, type=click.Path(exists=True), help="Path to service JSON spec")
# @click.option("--output", required=True, type=click.Path(), help="Output directory for Helm chart")
# def generate(spec, output):
#     """Generate Helm chart from JSON spec"""
#     # Load JSON spec
#     with open(spec) as f:
#         spec_data = json.load(f)

#     # Validate JSON
#     validate_spec(spec_data)

#     service_name = spec_data["name"]
#     chart_dir = os.path.join(output, service_name)

#     # Create directories
#     os.makedirs(os.path.join(chart_dir, "templates"), exist_ok=True)

#     click.echo(f"✅ Generating Helm chart for service: {service_name}")

#     # Render files
#     files = {
#         "Chart.yaml": "Chart.yaml.j2",
#         "values.yaml": "values.yaml.j2",
#         "templates/deployment.yaml": "deployment.yaml.j2",
#         "templates/service.yaml": "service.yaml.j2",
#         "templates/ingress.yaml": "ingress.yaml.j2",
#         "templates/secret.yaml": "secret.yaml.j2",
#         "templates/configmap.yaml": "configmap.yaml.j2"
#     }

#     for out_file, template in files.items():
#         content = render_template(template, spec_data)
#         out_path = os.path.join(chart_dir, out_file)
#         with open(out_path, "w") as f:
#             f.write(content)
#         click.echo(f"   → {out_file}")

#     click.echo(f"\n🎉 Helm chart generated at {chart_dir}")


# if __name__ == "__main__":
#     generate()


import os
import json
import click
import jinja2
import jsonschema
from jsonschema import validate
import yaml  # ✅ Added for YAML serialization

# Paths
BASE_DIR = os.path.dirname(__file__)
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
SCHEMA_FILE = os.path.join(BASE_DIR, "schema", "service-schema.json")

# Load schema once
with open(SCHEMA_FILE) as f:
    SCHEMA = json.load(f)

# Setup Jinja2
env = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
    trim_blocks=True,
    lstrip_blocks=True
)


def validate_spec(spec: dict):
    """Validate JSON spec against schema"""
    try:
        validate(instance=spec, schema=SCHEMA)
        return True
    except jsonschema.exceptions.ValidationError as e:
        raise click.ClickException(f"Invalid spec: {e.message}")


def render_template(template_name: str, context: dict, is_values: bool = False) -> str:
    """Render Jinja2 template with context"""
    template = env.get_template(template_name)

    # ✅ Fix: Serialize values.yaml to proper YAML format
    if is_values:
        context = {**context, "to_yaml": lambda x: yaml.dump(x, default_flow_style=False, sort_keys=False)}

    return template.render(**context)


@click.command()
@click.option("--spec", required=True, type=click.Path(exists=True), help="Path to service JSON spec")
@click.option("--output", required=True, type=click.Path(), help="Output directory for Helm chart")
def generate(spec, output):
    """Generate Helm chart from JSON spec"""
    # Load JSON spec
    with open(spec) as f:
        spec_data = json.load(f)

    # Validate JSON
    validate_spec(spec_data)

    service_name = spec_data["name"]
    chart_dir = os.path.join(output, service_name)

    # Create directories
    os.makedirs(os.path.join(chart_dir, "templates"), exist_ok=True)

    click.echo(f"✅ Generating Helm chart for service: {service_name}")

    # Render files
    files = {
        "Chart.yaml": ("Chart.yaml.j2", False),
        "values.yaml": ("values.yaml.j2", True),  # ✅ Mark values.yaml for YAML serialization
        "templates/deployment.yaml": ("deployment.yaml.j2", False),
        "templates/service.yaml": ("service.yaml.j2", False),
        "templates/ingress.yaml": ("ingress.yaml.j2", False),
        "templates/secret.yaml": ("secret.yaml.j2", False),
        "templates/configmap.yaml": ("configmap.yaml.j2", False)
    }

    for out_file, (template, is_values) in files.items():
        content = render_template(template, spec_data, is_values)
        out_path = os.path.join(chart_dir, out_file)
        with open(out_path, "w") as f:
            f.write(content)
        click.echo(f"   → {out_file}")

    click.echo(f"\n🎉 Helm chart generated at {chart_dir}")


if __name__ == "__main__":
    generate()
