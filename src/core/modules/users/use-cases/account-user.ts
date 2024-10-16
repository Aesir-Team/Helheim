import AuthService from "../service/auth-service";
import ReadUser from "./read-user";
import type userInterface from "../interface/user";
import UserInfo from "../mapper/user-info";
import MangaService from "../service/manga-service";

export default class AccountUser {
    private authServices: AuthService;
    private readUser: ReadUser;
    private userInfo: UserInfo
    private mangaServices: MangaService

    constructor() {
        this.readUser = new ReadUser();
        this.authServices = new AuthService();
        this.userInfo = new UserInfo()
        this.mangaServices = new MangaService()
    }

    async loginUser(email: string, password: string): Promise<string> {
        const user: userInterface | null = await this.readUser.findOneByEmail(email);

        if (!user) throw new Error("User not found");
        if (user.password !== password) throw new Error("Incorrect password");

        const token = await this.authServices.singJwt(String(user.email));
        return token;
    }

    async userProfile(jwt: string): Promise<userInterface | null> {
        return await this.userInfo.userProfile(jwt)
    }

    async setFavorites(jwt: string, mangaSlug: string) {
        return await this.mangaServices.setFavorite(jwt, mangaSlug);
    }

    async getAllFavorite(jwt: string) {
        return await this.mangaServices.getFavorites(jwt);
    }
}
