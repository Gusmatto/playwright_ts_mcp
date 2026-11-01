import { APIRequestContext } from "@playwright/test";

export interface ApiResponse {
    status: number;
    body: any;
}

export class ApiClient {
    constructor(private request: APIRequestContext) {}

    private async send(
        method: 'get' | 'put' | 'post' | 'delete',
        path: string,
        options?: { form?: Record<string, string>; params?: Record<string, string> }
        ): Promise<ApiResponse> {

    async getProducts(): Promise<ApiResponse> {

    }
    async searchProduct(term: string): Promise<ApiResponse>
    async verifyLogin(email: string, password: string): Promise<ApiResponse>
    async createAccount(data: any): Promise<ApiResponse>
    async getUserByEmail(email: string): Promise<ApiResponse>
    async deleteAccount(email: string, password: string): Promise<ApiResponse>

}