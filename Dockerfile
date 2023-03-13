FROM archlinux

RUN pacman -Syu deno jre-openjdk-headless vim zellij --needed --noconfirm

RUN mkdir /fresh-playground

WORKDIR /fresh-playground

ADD . .

RUN cp .env.example .env

ONBUILD RUN deno cache main.ts --import-map=import_map.json

RUN mkdir certs

EXPOSE 8000

CMD deno run -A --watch=static/,routes/,certs/ main.ts

# docker run -p 8000:8000 ghcr.io/rnbguy/fresh-playground:main
