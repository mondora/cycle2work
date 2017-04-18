#!groovy​
node {
    def project_name = "cycle2work"
    def docker_registry = "b2bregistry-on.azurecr.io"
    def docker_image_name = project_name
    def docker_image_tag = env.BRANCH_NAME
    def branch_name = env.BRANCH_NAME
    echo "Building docker image: ${docker_image_name}:${docker_image_tag}"

    try {

        stage("Checkout") {
            checkout scm
        }

        stage("Build docker image") {
            sh "docker build . -t ${docker_image_name}:${docker_image_tag}"
        }

        stage("Tag docker image") {
            sh "docker tag ${docker_image_name}:${docker_image_tag} ${docker_registry}/${docker_image_name}:${docker_image_tag}"
        }

        stage("Push docker image") {
            sh "docker push ${docker_registry}/${docker_image_name}:${docker_image_tag}"
        }

        stage("Cleanup docker image") {
            sh "docker image prune -a -f"
        }
        
        stage("Deploy to kubernetes cluster") {
                def change_cause = sh(
                    script: "git log --oneline -1",
                    returnStdout: true
                ).trim()
                build(
                    job: "ts-k8s-deploy-configs",
                    parameters: [
                        [
                            $class: "StringParameterValue",
                            name: "PROJECT_NAME",
                            value: project_name
                        ],
                        [
                            $class: "StringParameterValue",
                            name: "STAGE",
                            value: branch_name
                        ],
                        [
                            $class: "StringParameterValue",
                            name: "CHANGE_CAUSE",
                            value: change_cause
                        ]
                    ],
                    wait: false
                )
        }

        stage("Notify") {
            slackSend color: "good", message: "B2B - ${JOB_NAME} - ${BUILD_DISPLAY_NAME} Success (<${BUILD_URL}|Open>)"
        }

    } catch (err) {
        slackSend color: "danger", message: "B2B - ${JOB_NAME} - ${BUILD_DISPLAY_NAME} Failure (<${BUILD_URL}|Open>) - Caught: ${err}"
        currentBuild.result = "FAILURE"
    }

}
