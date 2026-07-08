import { Bell, ChevronLeft, HelpCircle } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";


export const TopNav = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    return <nav className="bg-surface/80 backdrop-blur-xl sticky top-0 z-50 border-b border-outline-variant/10">
        <div className="max-w-screen-2xl mx-auto px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-8">
                <button
                    onClick={() => navigate("/")}
                    className="text-on-surface-variant hover:text-primary transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="text-2xl font-bold tracking-tighter text-orange-900">
                    WebCall
                </span>
            </div>

            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-on-surface-variant"
                >
                    <Bell size={20} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-on-surface-variant"
                >
                    <HelpCircle size={20} />
                </Button>
                <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>
                        {user?.full_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                </Avatar>
            </div>
        </div>
    </nav>;
};  