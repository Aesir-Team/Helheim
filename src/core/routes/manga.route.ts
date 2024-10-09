import { Hono } from "hono";
import MangaController from "../modules/manga/manga.controller";

const MangaRouter = (app: Hono) => {
    const newManga = new MangaController();

    app.get('/all-manga', async (c) => {
        const pageParam = c.req.query('page');
        const pages = pageParam ? Number(pageParam) : 1;

        try {
            const mangaList = await newManga.getAllManga(pages);
            return c.json(mangaList);
        } catch (error) {
            return c.json({ message: "Error fetching manga", error: error }, 500);
        }
    });

    app.get('/most-populars', async (c) => {
        try {
            const mangaList = await newManga.mostPopulars();
            return c.json(mangaList);
        } catch (error) {
            return c.json({ message: "Error fetching popular manga", error: error }, 500);
        }
    })
}

export default MangaRouter;
