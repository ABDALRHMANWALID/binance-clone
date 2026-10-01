"use client";

import Link from "next/link"
import { useEffect, useState } from "react";

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, []);

    return (
        <header className="border-b border-slate-800">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="text-xl font-bold">
                    Binance<span className="text-yellow-400">.</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden items-center gap-8 md:flex">
                    <Link
                        href="/p2p"
                        className="text-sm text-slate-300 transition hover:text-white"
                    >
                        P2P
                    </Link>

                    <Link
                        href="/markets"
                        className="text-sm text-slate-300 transition hover:text-white"
                    >
                        Markets
                    </Link>

                    <Link
                        href="/trade"
                        className="text-sm text-slate-300 transition hover:text-white"
                    >
                        Trade
                    </Link>
                </nav>

                {/* Authentication */}
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <Link
                            href="/profile"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-yellow-400 hover:text-yellow-400"
                            aria-label="Profile"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 6a3.75 3.75 0 11-7.5 0
                    3.75 3.75 0 017.5 0z
                    M4.5 20.25a8.25 8.25 0 0115 0"
                                />
                            </svg>
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
                            >
                                Login
                            </Link>

                            <Link
                                href="/register"
                                className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header