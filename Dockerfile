FROM archlinux

RUN pacman -Syu git --needed --noconfirm

RUN git clone https://github.com/rnbguy/fresh-playground

WORKDIR /fresh-playground

RUN pacman -Syu deno jre-openjdk-headless --needed --noconfirm


CMD deno run --allow-env --allow-read --allow-write --allow-net --allow-run main.ts

# docker run -it --rm -p 8000:8000 "${IMAGE_ID}"