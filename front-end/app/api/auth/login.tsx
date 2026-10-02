import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const LoginCall = async (request: any) => {
    try {
        const body = await request.json();
        const loginUserValidation = z.object({
            email: z.string().min(2).max(200).email(),
            password: z.string().min(6),
        });

        const validation = loginUserValidation.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { message: validation.error.issues[0].message },
                { status: 400 },
            );
        } else {
            console.log("Validation successful:", validation.data);
            const loginCall = async (
                loginData: any,
            ): Promise<any> => {
                const res = await axios.post(
                    `http://localhost:4000/auth/login`,
                    validation.data,
                );
                return res.data;
            };
        }
    } catch (error) {
        console.log(error);
    }
}