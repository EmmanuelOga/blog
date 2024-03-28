version_settings(constraint='>=0.33.1')

docker_build(
    'blog',
    context='.',
    dockerfile='Dockerfile',
)

k8s_yaml('k8s/deployment.yaml')
k8s_yaml('k8s/service.yaml')