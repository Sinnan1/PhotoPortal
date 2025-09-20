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
    RefreshCw
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";

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

export default function AdminInvitationsPage() {
    const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showInviteForm, setShowInviteForm] = useState(false);

    // Helper function to get auth token
    const getAuthToken = () => {
        return document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1];
    };

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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/invitations/list`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setInvitations(data.data.invitations);
            } else {
                setError('Failed to load invitations');
            }
        } catch (err) {
            setError('Failed to connect to server');
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

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/invite-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess("Admin invitation sent successfully!");
                setFormData({ name: "", email: "" });
                setShowInviteForm(false);
                loadInvitations(); // Reload invitations
            } else {
                setError(data.error || 'Failed to send invitation');
            }
        } catch (err) {
            setError('Failed to send invitation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyInvitationLink = (token: string) => {
        const invitationUrl = `${window.location.origin}/admin/activate?token=${token}`;
        navigator.clipboard.writeText(invitationUrl);
        setSuccess("Invitation link copied to clipboard!");
    };

    const revokeInvitation = async (invitationId: string) => {
        if (!confirm("Are you sure you want to revoke this invitation?")) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/invitations/${invitationId}/revoke`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setSuccess("Invitation revoked successfully!");
                loadInvitations();
            } else {
                setError(data.error || 'Failed to revoke invitation');
            }
        } catch (err) {
            setError('Failed to revoke invitation');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'ACCEPTED':
                return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
            case 'EXPIRED':
                return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
            case 'REVOKED':
                return <Badge variant="outline" className="text-gray-600 border-gray-600"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
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
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Invitations</h1>
                        <p className="text-gray-600 mt-2">Manage administrator account invitations</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={loadInvitations}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setShowInviteForm(true)}
                            disabled={loading}
                        >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Admin
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                )}

                {showInviteForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
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
                                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                type="text"
                                                placeholder="Enter full name"
                                                value={formData.name}
                                                onChange={(e) => handleInputChange('name', e.target.value)}
                                                className="pl-10"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="Enter email address"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="pl-10"
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
                                        className="flex-1"
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
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Pending & Recent Invitations</CardTitle>
                        <CardDescription>
                            View and manage administrator invitations
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && invitations.length === 0 ? (
                            <div className="text-center py-8">
                                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">Loading invitations...</p>
                            </div>
                        ) : invitations.length === 0 ? (
                            <div className="text-center py-8">
                                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600">No invitations found</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Click "Invite Admin" to send your first invitation
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invitations.map((invitation) => (
                                    <div
                                        key={invitation.id}
                                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-gray-900">{invitation.name}</h3>
                                                    {getStatusBadge(invitation.status)}
                                                </div>
                                                <p className="text-gray-600 mb-1">{invitation.email}</p>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Invited: {formatDate(invitation.createdAt)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Expires: {formatDate(invitation.expiresAt)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Invited by: {invitation.invitedBy.name} ({invitation.invitedBy.email})
                                                </p>
                                            </div>

                                            <div className="flex gap-2 ml-4">
                                                {invitation.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => copyInvitationLink(invitation.token)}
                                                        >
                                                            <Copy className="h-3 w-3 mr-1" />
                                                            Copy Link
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => revokeInvitation(invitation.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Revoke
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
        </AdminLayout>
    );
}