import click
import yaml
import os

@click.command()
@click.option('--config', default='app.yaml', help='Path to the app configuration file.')
@click.option('--output', default='output-chart', help='Path where the Helm chart will be generated.')
def generate(config, output):
    """Generate a Helm chart based on a YAML configuration file."""
    with open(config, 'r') as f:
        app_config = yaml.safe_load(f)

    service_name = app_config['name']
    image = app_config['image']
    replicas = app_config.get('replicas', 1)
    ports = app_config.get('ports', [])
    env_vars = app_config.get('env', [])
    secrets = app_config.get('secrets', [])
    volumes = app_config.get('volumes', [])

    os.makedirs(os.path.join(output, "templates"), exist_ok=True)

    # Chart.yaml
    chart_yaml = f"""apiVersion: v2
name: {service_name}
description: A Helm chart for {service_name}
version: 0.1.0
appVersion: "1.0"
"""
    with open(os.path.join(output, "Chart.yaml"), "w") as f:
        f.write(chart_yaml)

    # values.yaml
    values_yaml = {
        "replicaCount": replicas,
        "image": {"repository": image, "tag": "latest", "pullPolicy": "IfNotPresent"},
        "service": {"ports": ports},
        "env": env_vars,
        "secrets": secrets,
        "volumes": volumes
    }
    with open(os.path.join(output, "values.yaml"), "w") as f:
        yaml.dump(values_yaml, f)

    # Deployment.yaml
    deployment_yaml = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {service_name}
spec:
  replicas: {{ {{ .Values.replicaCount }} }}
  selector:
    matchLabels:
      app: {service_name}
  template:
    metadata:
      labels:
        app: {service_name}
    spec:
      containers:
        - name: {service_name}
          image: {{ {{ .Values.image.repository }} }}:{{ {{ .Values.image.tag }} }}
          ports:
{os.linesep.join([f"            - containerPort: {p}" for p in ports])}
          env:
{os.linesep.join([f"            - name: {e['name']}\n              value: {e['value']}" for e in env_vars])}
          volumeMounts:
{os.linesep.join([f"            - name: {v['name']}\n              mountPath: {v['mountPath']}" for v in volumes])}
      volumes:
{os.linesep.join([f"        - name: {v['name']}\n          emptyDir: {{}}" for v in volumes])}
"""
    with open(os.path.join(output, "templates/deployment.yaml"), "w") as f:
        f.write(deployment_yaml)

    # Service.yaml
    service_yaml = f"""apiVersion: v1
kind: Service
metadata:
  name: {service_name}
spec:
  selector:
    app: {service_name}
  ports:
{os.linesep.join([f"    - protocol: TCP\n      port: {p}\n      targetPort: {p}" for p in ports])}
"""
    with open(os.path.join(output, "templates/service.yaml"), "w") as f:
        f.write(service_yaml)

    print(f"Helm chart for {service_name} generated at {output}")

if __name__ == "__main__":
    generate()
