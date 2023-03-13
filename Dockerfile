FROM archlinux

RUN pacman -Syu git --needed --noconfirm

RUN git clone https://github.com/rnbguy/fresh-playground

WORKDIR /fresh-playground

RUN pacman -Syu deno jre-openjdk-headless --needed --noconfirm

RUN cp .env.example .env

RUN deno cache main.ts --import-map=import_map.json

EXPOSE 8000

CMD deno run --allow-env --allow-read --allow-write --allow-net --allow-run main.ts

# docker run -p 8000:8000 ghcr.io/rnbguy/fresh-playground:main
