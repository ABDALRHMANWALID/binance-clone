"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { z } from "zod";

const depositRequestSchema = z.object({
    asset: z.string().min(1, "Please select an asset"),
    network: z.string().min(1, "Please select a network"),
});

const depositResponseSchema = z.object({
    depositAddress: z.string().min(1),
});

const depositSuccessSchema = z.object({
    status: z.literal("Success"),
    amount: z.number(),
    currency: z.string(),
    transactionId: z.string(),
    timestamp: z.string(),
});

type DepositSuccess = z.infer<typeof depositSuccessSchema>;

const assets = [
    {
        symbol: "USDT",
        name: "Tether",
        networks: ["Ethereum", "Sepolia"],
    },
    {
        symbol: "ETH",
        name: "Ethereum",
        networks: ["Ethereum", "Sepolia"],
    },
];

const Deposit = () => {
    const [asset, setAsset] = useState("");
    const [network, setNetwork] = useState("");

    const [depositAddress, setDepositAddress] = useState("");
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState<DepositSuccess | null>(null);

    const socketRef = useRef<Socket | null>(null);

    const selectedAsset = assets.find(
        (item) => item.symbol === asset
    );

    /*
     * Reset network when asset changes
     */
    useEffect(() => {
        setNetwork("");
    }, [asset]);

    /*
     * Cleanup WebSocket when component unmounts
     */
    useEffect(() => {
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const handleDeposit = async () => {
        setError("");
        setDepositAddress("");
        setSuccess(null);

        const validation = depositRequestSchema.safeParse({
            asset,
            network,
        });

        if (!validation.success) {
            setError(validation.error.issues[0]?.message ?? "Invalid data");
            return;
        }

        try {
            setLoading(true);

            /*
             * Request deposit address
             */
            const response = await axios.post(
                "http://localhost:4000/deposit",
                {
                    asset,
                    network,
                }
                ,{
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            const parsedResponse = depositResponseSchema.safeParse(
                response.data
            );

            if (!parsedResponse.success) {
                throw new Error("Invalid response from server");
            }

            const address = parsedResponse.data.depositAddress;

            setDepositAddress(address);

            /*
             * Close previous socket if there is one
             */
            socketRef.current?.disconnect();

            /*
             * Connect to deposit WebSocket
             */
            const socket = io(
                "http://localhost:4000/checkMyDepositAddress",
                {
                    transports: ["websocket"],
                }
            );

            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("Deposit WebSocket connected");

                /*
                 * Tell backend which address we are waiting for.
                 */
                socket.emit("watchDepositAddress", {
                    depositAddress: address,
                    asset,
                    network,
                });
            });

            socket.on("depositSuccess", (data) => {
                const result = depositSuccessSchema.safeParse(data);

                if (!result.success) {
                    console.error(
                        "Invalid deposit WebSocket response",
                        result.error
                    );
                    return;
                }

                setSuccess(result.data);

                /*
                 * Deposit was found, so we don't
                 * need to keep listening.
                 */
                socket.disconnect();
                socketRef.current = null;
            });

            socket.on("connect_error", () => {
                setError("Failed to connect to deposit service.");
            });

            socket.on("disconnect", () => {
                console.log("Deposit WebSocket disconnected");
            });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(
                    err.response?.data?.message ||
                        "Failed to generate deposit address."
                );
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    };

    const copyAddress = async () => {
        if (!depositAddress) return;

        await navigator.clipboard.writeText(depositAddress);
    };

    const closeSuccessModal = () => {
        setSuccess(null);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-2xl">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">
                        Deposit Crypto
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                        Select an asset and network to generate your deposit
                        address.
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    {/* Asset */}
                    <div className="mb-6">
                        <label
                            htmlFor="asset"
                            className="mb-2 block text-sm font-medium text-slate-300"
                        >
                            Asset
                        </label>

                        <select
                            id="asset"
                            value={asset}
                            onChange={(event) =>
                                setAsset(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                        >
                            <option value="">
                                Select asset
                            </option>

                            {assets.map((item) => (
                                <option
                                    key={item.symbol}
                                    value={item.symbol}
                                >
                                    {item.symbol} - {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Network */}
                    <div className="mb-6">
                        <label
                            htmlFor="network"
                            className="mb-2 block text-sm font-medium text-slate-300"
                        >
                            Network
                        </label>

                        <select
                            id="network"
                            value={network}
                            disabled={!selectedAsset}
                            onChange={(event) =>
                                setNetwork(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">
                                Select network
                            </option>

                            {selectedAsset?.networks.map(
                                (networkName) => (
                                    <option
                                        key={networkName}
                                        value={networkName}
                                    >
                                        {networkName}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Warning */}
                    {asset && network && (
                        <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                            <p className="text-sm text-yellow-400">
                                Only send {asset} using the{" "}
                                <span className="font-semibold">
                                    {network}
                                </span>{" "}
                                network to this address.
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                            <p className="text-sm text-red-400">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Deposit Button */}
                    <button
                        type="button"
                        onClick={handleDeposit}
                        disabled={
                            loading ||
                            !asset ||
                            !network
                        }
                        className="w-full rounded-lg bg-yellow-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? "Generating address..."
                            : "Deposit"}
                    </button>

                    {/* Deposit Address */}
                    {depositAddress && (
                        <div className="mt-8">
                            <div className="mb-2 flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-300">
                                    Deposit Address
                                </label>

                                <span className="text-xs text-green-400">
                                    Waiting for deposit
                                </span>
                            </div>

                            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
                                <p className="min-w-0 flex-1 break-all font-mono text-sm text-slate-300">
                                    {depositAddress}
                                </p>

                                <button
                                    type="button"
                                    onClick={copyAddress}
                                    className="shrink-0 rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-yellow-400 hover:text-yellow-400"
                                >
                                    Copy
                                </button>
                            </div>

                            <p className="mt-3 text-xs text-slate-500">
                                Send only {asset} on the {network} network.
                                Sending other assets or using another
                                network may result in permanent loss.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {success && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                        {/* Success Icon */}
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-green-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <h2 className="mt-5 text-center text-2xl font-bold">
                            Deposit Successful
                        </h2>

                        <p className="mt-2 text-center text-sm text-slate-400">
                            Your deposit has been detected successfully.
                        </p>

                        {/* Details */}
                        <div className="mt-6 space-y-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Amount
                                </span>

                                <span className="font-medium text-white">
                                    {success.amount}{" "}
                                    {success.currency}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    Transaction ID
                                </span>

                                <span className="max-w-[200px] truncate font-mono text-sm text-slate-300">
                                    {success.transactionId}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Time
                                </span>

                                <span className="text-sm text-slate-300">
                                    {new Date(
                                        success.timestamp
                                    ).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={closeSuccessModal}
                            className="mt-6 w-full rounded-lg bg-yellow-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-300"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deposit;