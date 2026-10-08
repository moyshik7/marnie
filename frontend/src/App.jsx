import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatView from "./components/ChatView";
import DeepResearchView from "./components/DeepResearchView";
import SettingsModal from "./components/SettingsModal";
import ToolsPanel from "./components/ToolsPanel";
import ReportViewer from "./components/ReportViewer";
import {
    listConversations,
    createConversation,
    getConversation,
    renameConversation,
    updateConversation,
    deleteConversation,
    getSettings,
    updateSettings,
    listModels,
    checkOngoingResearch,
} from "./services/api";

export default function App() {
    // Check if directly visiting /report/:slug
    const [reportSlug, setReportSlug] = useState(() => {
        const path = window.location.pathname;
        if (path.startsWith("/report/")) {
            return path.replace(/^\/report\//, "");
        }
        return null;
    });

    // Theme state
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("marnie_theme") || "light";
    });

    useEffect(() => {
        const onPopState = () => {
            const path = window.location.pathname;
            if (path.startsWith("/report/")) {
                setReportSlug(path.replace(/^\/report\//, ""));
            } else {
                setReportSlug(null);
            }
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

    // Conversations state
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [activeModel, setActiveModel] = useState("");
    const [availableModels, setAvailableModels] = useState([]);
    const [backendConnected, setBackendConnected] = useState(false);

    // Modals & Navigation state
    const [activeSection, setActiveSection] = useState("chat"); // 'chat' | 'research'
    const [isResearchOngoing, setIsResearchOngoing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem("marnie_sidebar_collapsed") === "true";
    });

    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem("marnie_sidebar_collapsed", String(next));
            return next;
        });
    };

    // Apply theme to DOM document
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("marnie_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    // Check health, research ongoing status and load conversations, models & settings
    useEffect(() => {
        initializeWorkspace();
        const interval = setInterval(checkHealth, 15000);
        const researchInterval = setInterval(pollResearchStatus, 4000);
        return () => {
            clearInterval(interval);
            clearInterval(researchInterval);
        };
    }, []);

    const pollResearchStatus = async () => {
        try {
            const res = await checkOngoingResearch();
            setIsResearchOngoing(Boolean(res?.ongoing));
        } catch {}
    };

    const checkHealth = async () => {
        try {
            const res = await fetch("/health");
            if (res.ok) setBackendConnected(true);
            else setBackendConnected(false);
        } catch {
            setBackendConnected(false);
        }
    };

    const initializeWorkspace = async () => {
        await checkHealth();

        // 1. Fetch available models from Ollama
        let modelsList = [];
        try {
            modelsList = await listModels();
            setAvailableModels(modelsList);
        } catch (e) {
            console.warn("Could not load Ollama models:", e);
        }

        // 2. Fetch settings
        let initialModel = "";
        try {
            const settingsData = await getSettings();
            const configuredModel = settingsData?.settings?.default_model;
            if (
                configuredModel &&
                (modelsList.length === 0 ||
                    modelsList.includes(configuredModel))
            ) {
                initialModel = configuredModel;
            }
        } catch (e) {
            console.warn("Could not load settings:", e);
        }

        // Fallback: If configured model is not in available models or empty, pick first model from Ollama
        if (!initialModel && modelsList.length > 0) {
            initialModel = modelsList[0];
        }
        if (!initialModel) {
            initialModel = "llama3.2";
        }

        setActiveModel(initialModel);

        // 3. Load conversations
        await refreshConversations(initialModel, modelsList);
    };

    const refreshConversations = async (fallbackModel, modelsList = []) => {
        try {
            const list = await listConversations();
            setConversations(list || []);

            if (list && list.length > 0) {
                if (!activeConversationId) {
                    selectConversation(list[0].id, list[0]);
                } else {
                    const current = await getConversation(activeConversationId);
                    setActiveConversation(current);
                    if (current.model) {
                        // Check if current.model exists in Ollama
                        const models = modelsList.length
                            ? modelsList
                            : availableModels;
                        if (
                            models.length === 0 ||
                            models.includes(current.model)
                        ) {
                            setActiveModel(current.model);
                        }
                    }
                }
            } else {
                setActiveConversation(null);
                setActiveConversationId(null);
            }
        } catch (err) {
            console.warn("Failed to load conversations:", err);
        }
    };

    const selectConversation = async (id, prefetched = null) => {
        setActiveConversationId(id);
        try {
            const conv = prefetched || (await getConversation(id));
            setActiveConversation(conv);
            if (conv.model) {
                // If the model in the conversation is valid/known, activate it
                if (
                    availableModels.length === 0 ||
                    availableModels.includes(conv.model)
                ) {
                    setActiveModel(conv.model);
                } else if (availableModels.length > 0) {
                    // If conversation had an unavailable model like llama3.2, auto-update it to active/first model
                    const modelToUse = activeModel || availableModels[0];
                    setActiveModel(modelToUse);
                    updateConversation(id, { model: modelToUse }).catch(
                        console.warn,
                    );
                }
            }
        } catch (err) {
            console.error("Failed to load conversation:", err);
        }
    };

    const handleModelChange = async (newModel) => {
        if (!newModel) return;
        setActiveModel(newModel);

        // 1. Update active conversation in state and SQLite
        if (activeConversationId) {
            setActiveConversation((prev) =>
                prev ? { ...prev, model: newModel } : prev,
            );
            setConversations((prev) =>
                prev.map((c) =>
                    c.id === activeConversationId
                        ? { ...c, model: newModel }
                        : c,
                ),
            );
            try {
                await updateConversation(activeConversationId, {
                    model: newModel,
                });
            } catch (err) {
                console.warn("Failed to update conversation model in DB:", err);
            }
        }

        // 2. Persist as workspace default model in settings
        try {
            await updateSettings({ default_model: newModel });
        } catch (err) {
            console.warn("Failed to update default_model in settings:", err);
        }
    };

    const handleNewConversation = async () => {
        try {
            const modelToUse =
                activeModel ||
                (availableModels.length > 0 ? availableModels[0] : "llama3.2");
            const newConv = await createConversation(
                "New conversation",
                modelToUse,
            );
            await refreshConversations(modelToUse);
            selectConversation(newConv.id, newConv);
        } catch (err) {
            alert(`Error creating chat: ${err.message}`);
        }
    };

    const handleDiscussResearch = async (topic) => {
        try {
            const modelToUse =
                activeModel ||
                (availableModels.length > 0 ? availableModels[0] : "llama3.2");
            const newConv = await createConversation(
                `Discuss: ${topic.slice(0, 32)}`,
                modelToUse,
            );
            await refreshConversations(modelToUse);
            selectConversation(newConv.id, newConv);
            setActiveSection("chat");
        } catch (err) {
            setActiveSection("chat");
        }
    };

    const handleDeleteConversation = async (id) => {
        try {
            await deleteConversation(id);
            if (activeConversationId === id) {
                setActiveConversationId(null);
                setActiveConversation(null);
            }
            await refreshConversations(activeModel);
        } catch (err) {
            alert(`Error deleting chat: ${err.message}`);
        }
    };

    const handleRenameConversation = async (id, title) => {
        try {
            await renameConversation(id, title);
            await refreshConversations(activeModel);
        } catch (err) {
            alert(`Error renaming chat: ${err.message}`);
        }
    };

    const handleSelectConversation = (id) => {
        setActiveSection("chat");
        selectConversation(id);
    };

    const handleCreateNewConversation = async () => {
        setActiveSection("chat");
        await handleNewConversation();
    };

    if (reportSlug) {
        return (
            <ReportViewer
                slug={reportSlug}
                theme={theme}
                onToggleTheme={toggleTheme}
            />
        );
    }

    return (
        <div
            style={{
                display: "flex",
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                backgroundColor: "var(--bg-primary)",
            }}
        >
            {/* Claude-style Sidebar */}
            <Sidebar
                conversations={conversations}
                activeConversationId={activeSection === "chat" ? activeConversationId : null}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleCreateNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={handleRenameConversation}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenTools={() => setIsToolsOpen(true)}
                onOpenDeepResearch={() => setActiveSection("research")}
                activeSection={activeSection}
                isResearchOngoing={isResearchOngoing}
                theme={theme}
                onToggleTheme={toggleTheme}
                backendConnected={backendConnected}
                activeModel={activeModel}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={toggleSidebar}
            />

            {/* Main View Area: Chat vs Deep Research */}
            <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {activeSection === "research" ? (
                    <DeepResearchView
                        activeModel={activeModel}
                        availableModels={availableModels}
                        onClose={() => setActiveSection("chat")}
                        onDiscuss={handleDiscussResearch}
                        onResearchCountChange={(hasOngoing) => setIsResearchOngoing(hasOngoing)}
                    />
                ) : (
                    <ChatView
                        conversation={activeConversation}
                        activeModel={activeModel}
                        availableModels={availableModels}
                        onModelChanged={handleModelChange}
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        onOpenTools={() => setIsToolsOpen(true)}
                        onOpenSettings={() => setIsSettingsOpen(true)}
                        onRefreshConversations={() =>
                            refreshConversations(activeModel)
                        }
                    />
                )}
            </main>

            {/* Settings Modal (Discord Webhook, Ollama URL, Models, Future Labs) */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentModel={activeModel}
                onModelChanged={handleModelChange}
                onSettingsUpdated={(newSettings) => {
                    if (newSettings.default_model)
                        handleModelChange(newSettings.default_model);
                }}
            />

            {/* Tools Drawer (Tasks, Cronjobs, Bash, JS Runner, File Search) */}
            <ToolsPanel
                isOpen={isToolsOpen}
                onClose={() => setIsToolsOpen(false)}
            />
        </div>
    );
}
