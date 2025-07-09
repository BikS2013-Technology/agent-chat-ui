docker stop agent-chat-ui
docker rm agent-chat-ui
docker run \
    --name agent-chat-ui \
    --add-host=host.docker.internal:host-gateway \
    --restart always \
  -p 3099:3000 \
  -d agent-chat-ui