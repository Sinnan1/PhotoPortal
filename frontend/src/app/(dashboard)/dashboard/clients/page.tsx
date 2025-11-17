"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  Mail,
  Calendar,
  Loader2,
  UserPlus,
  TrendingUp,
  CheckCircle,
  Download,
  XCircle,
  MessageSquare,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Client {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  canDownload: boolean;
  feedbackRequestActive?: boolean;
  feedbackRequestedAt?: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const response = await api.getClients();
      setClients(response.data.clients);
    } catch (error) {
      showToast("Failed to load clients", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await api.createClient(newClient);
      setNewClient({ name: "", email: "", password: "" });
      setShowCreateDialog(false);
      fetchClients();
      showToast("Client created successfully", "success");
    } catch (error) {
      showToast("Failed to create client", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleDownload = async (clientId: string, currentStatus: boolean) => {
    try {
      await api.toggleClientDownload(clientId, !currentStatus);
      setClients(clients.map((client) => 
        client.id === clientId 
          ? { ...client, canDownload: !currentStatus }
          : client
      ));
      showToast(
        `Download ${!currentStatus ? "enabled" : "disabled"} for client`,
        "success"
      );
    } catch (error) {
      showToast("Failed to update download permission", "error");
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to remove this client?")) return;

    try {
      await api.removeClient(clientId);
      setClients(clients.filter((client) => client.id !== clientId));
      showToast("Client removed successfully", "success");
    } catch (error) {
      showToast("Failed to remove client", "error");
    }
  };

  const handleRequestFeedback = async (clientId: string, clientName: string) => {
    try {
      await api.requestClientFeedback(clientId);
      showToast(`Feedback request sent to ${clientName}`, "success");
      fetchClients(); // Refresh to update feedback status
    } catch (error) {
      showToast("Failed to request feedback", "error");
    }
  };

  if (user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            This page is only available to photographers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Modern Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Client Management</h1>
          <p className="text-muted-foreground text-lg">Manage your clients and their gallery access</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-sm">
              <Plus className="mr-2 h-5 w-5" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New Client</DialogTitle>
              <DialogDescription className="text-base">
                Create a new client account. They will receive login credentials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient}>
              <div className="space-y-5 py-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium mb-2 block">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) =>
                      setNewClient({ ...newClient, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) =>
                      setNewClient({ ...newClient, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    className="h-11"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium mb-2 block">
                    Password
                  </Label>
                  <PasswordInput
                    id="password"
                    value={newClient.password}
                    onChange={(e) =>
                      setNewClient({ ...newClient, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="h-11"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="h-11"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="h-11">
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Client
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="border-2 hover:border-primary/20 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <p className="text-4xl font-bold tracking-tight">{clients.length}</p>
              <p className="text-xs text-muted-foreground">Active client accounts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/20 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-2xl">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
              <Badge variant="secondary" className="text-xs">30 days</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recent Clients</p>
              <p className="text-4xl font-bold tracking-tight">
                {clients.filter(
                  (client) =>
                    new Date(client.createdAt) >
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-xs text-muted-foreground">Added in last 30 days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 hover:border-primary/20 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-2xl">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
              <Badge variant="outline" className="text-xs border-green-600 text-green-600">Active</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Client Status</p>
              <p className="text-4xl font-bold tracking-tight">{clients.length}</p>
              <p className="text-xs text-muted-foreground">All clients active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Clients Table */}
      <Card className="border-2">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-2xl">Your Clients</CardTitle>
          <CardDescription className="text-base">
            Manage client accounts and their gallery access
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No clients yet</h3>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Get started by adding your first client to share galleries and collaborate.
              </p>
              <Button size="lg" onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="h-14 text-sm font-semibold">Name</TableHead>
                    <TableHead className="h-14 text-sm font-semibold">Email</TableHead>
                    <TableHead className="h-14 text-sm font-semibold">Role</TableHead>
                    <TableHead className="h-14 text-sm font-semibold">Joined</TableHead>
                    <TableHead className="h-14 text-sm font-semibold">Downloads</TableHead>
                    <TableHead className="text-right h-14 text-sm font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-semibold py-5">{client.name}</TableCell>
                      <TableCell className="py-5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{client.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className="font-medium">
                          {client.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="py-5">
                        <Button
                          variant={client.canDownload ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleDownload(client.id, client.canDownload)}
                          className="gap-2"
                        >
                          {client.canDownload ? (
                            <>
                              <Download className="h-4 w-4" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              Disabled
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right py-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={client.feedbackRequestActive ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleRequestFeedback(client.id, client.name)}
                            disabled={client.feedbackRequestActive}
                            className="gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {client.feedbackRequestActive ? "Requested" : "Request Feedback"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleRemoveClient(client.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}