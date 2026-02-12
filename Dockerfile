
FROM denoland/deno:2.6.5

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}

WORKDIR /app

COPY . .
RUN deno cache _fresh/server.js

EXPOSE 8000

USER deno

CMD ["serve", "--allow-net", "--allow-env", "--allow-read", "_fresh/server.js"]
