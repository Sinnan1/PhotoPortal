"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    UserPlus,
    Mail,
    User,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    Copy,
    Trash2,
    RefreshCw,
    Shield
} from "lucide-react";

interface AdminInvitation {
    id: string;
    email: string;
    name: string;
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
    token: string;
    expiresAt: string;
    createdAt: string;
    invitedBy: {
        name: string;
        email: string;
    };
}

import { adminApi } from "@/lib/admin-api";

export default function AdminInvitationsPage() {
    const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showInviteForm, setShowInviteForm] = useState(false);

    // Form data for new invitation
    const [formData, setFormData] = useState({
        name: "",
        email: ""
    });

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getAdminInvitations();

            if (response.success) {
                setInvitations(response.data.invitations);
            } else {
                setError('Failed to load invitations');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(""); // Clear error when user types
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError("Name is required");
            return false;
        }

        if (!formData.email.trim()) {
            setError("Email is required");
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError("Please enter a valid email address");
            return false;
        }

        return true;
    };

    const handleInviteAdmin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await adminApi.inviteAdmin({
                name: formData.name.trim(),
                email: formData.email.trim(),
            });

            if (response.success) {
                setSuccess("Admin invitation sent successfully!");
                setFormData({ name: "", email: "" });
                setShowInviteForm(false);
                loadInvitations(); // Reload invitations
            } else {
                setError(response.error || 'Failed to send invitation');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send invitation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyInvitationLink = (token: string) => {
        const invitationUrl = `${window.location.origin}/admin/activate?token=${token}`;
        navigator.clipboard.writeText(invitationUrl);
        setSuccess("Invitation link copied to clipboard!");
        setTimeout(() => setSuccess(""), 3000);
    };

    const revokeInvitation = async (invitationId: string) => {
        if (!confirm("Are you sure you want to revoke this invitation?")) {
            return;
        }

        try {
            setLoading(true);
            const response = await adminApi.revokeAdminInvitation(invitationId);

            if (response.success) {
                setSuccess("Invitation revoked successfully!");
                loadInvitations();
            } else {
                setError(response.error || 'Failed to revoke invitation');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to revoke invitation');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'ACCEPTED':
                return <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/10"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
            case 'EXPIRED':
                return <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-900/10"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
            case 'REVOKED':
                return <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50 dark:bg-gray-800/50"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Invitations</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                        Manage administrator account invitations
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        onClick={loadInvitations}
                        disabled={loading}
                        className="flex-1 sm:flex-none border-border/50 bg-background/50 backdrop-blur-sm"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setShowInviteForm(true)}
                        disabled={loading || showInviteForm}
                        className="flex-1 sm:flex-none bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Admin
                    </Button>
                </div>
            </div>

            {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/50">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
                </Alert>
            )}

            {showInviteForm && (
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-500 blur-xl" />
                    <Card className="relative border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-primary" />
                                Invite New Administrator
                            </CardTitle>
                            <CardDescription>
                                Send an invitation to create a new administrator account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInviteAdmin} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Enter full name"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="pl-10 bg-background/50 border-border/50"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="Enter email address"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="pl-10 bg-background/50 border-border/50"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowInviteForm(false);
                                            setFormData({ name: "", email: "" });
                                            setError("");
                                        }}
                                        className="flex-1 bg-transparent border-border/50"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={loading}
                                    >
                                        {loading ? 'Sending...' : 'Send Invitation'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Pending & Recent Invitations
                    </CardTitle>
                    <CardDescription>
                        View and manage administrator invitations
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading && invitations.length === 0 ? (
                        <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading invitations...</p>
                        </div>
                    ) : invitations.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserPlus className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">No invitations found</h3>
                            <p className="text-muted-foreground">
                                Click "Invite Admin" to send your first invitation
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invitations.map((invitation) => (
                                <div
                                    key={invitation.id}
                                    className="border border-border/50 rounded-lg p-4 bg-background/30 hover:bg-background/50 transition-colors group"
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{invitation.name}</h3>
                                                {getStatusBadge(invitation.status)}
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{invitation.email}</p>

                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Invited: {formatDate(invitation.createdAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Expires: {formatDate(invitation.expiresAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    By: {invitation.invitedBy.name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            {invitation.status === 'PENDING' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyInvitationLink(invitation.token)}
                                                        className="flex-1 sm:flex-none border-border/50 hover:bg-background"
                                                    >
                                                        <Copy className="h-3 w-3 sm:mr-1" />
                                                        <span className="block sm:hidden">Copy</span>
                                                        <span className="hidden sm:block">Copy Link</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => revokeInvitation(invitation.id)}
                                                        className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                                                    >
                                                        <Trash2 className="h-3 w-3 sm:mr-1" />
                                                        <span className="block sm:hidden">Revoke</span>
                                                        <span className="hidden sm:block">Revoke</span>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}