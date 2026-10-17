
pipeline {
    agent any

    environment {
        BACKEND_IMAGE = 'poovidha/crowd-ai-backend'
        FRONTEND_IMAGE = 'poovidha/crowd-ai-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project Files') {
            steps {
                sh '''
                    test -f docker-compose.yml
                    test -f backend/Dockerfile
                    test -f frontend/Dockerfile
                    test -f frontend/nginx.conf
                    echo "Crowd AI project files verified"
                '''
            }
        }

        stage('Validate Docker Compose') {
    steps {
        sh 'docker compose config'
    }
}

        stage('Build Backend Image') {
            steps {
                sh 'docker build -f backend/Dockerfile -t $BACKEND_IMAGE:$BUILD_NUMBER .'
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh 'docker build -f frontend/Dockerfile -t $FRONTEND_IMAGE:$BUILD_NUMBER .'
            }
        }

        stage('Login and Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    sh '''
                        set +x
                        echo "$DOCKERHUB_TOKEN" | docker login \
                            --username "$DOCKERHUB_USER" --password-stdin

                        docker tag "$BACKEND_IMAGE:$BUILD_NUMBER" \
                            "$BACKEND_IMAGE:latest"
                        docker tag "$FRONTEND_IMAGE:$BUILD_NUMBER" \
                            "$FRONTEND_IMAGE:latest"

                        docker push "$BACKEND_IMAGE:$BUILD_NUMBER"
                        docker push "$BACKEND_IMAGE:latest"

                        docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                        docker push "$FRONTEND_IMAGE:latest"

                        docker logout
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Crowd AI images built and published successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the failed stage in Console Output.'
        }
    }
}
