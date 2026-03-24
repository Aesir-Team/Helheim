-- Total reportado pela fonte externa (ex.: tamanho da lista no GET manga), para denominador estável na UI durante sync.
ALTER TABLE "mangas" ADD COLUMN "reportedChapterCount" INTEGER;
