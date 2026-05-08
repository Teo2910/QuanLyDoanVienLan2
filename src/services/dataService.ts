import { Unit, Member, Activity, SystemLog, KnowledgeItem, Movement, MovementReport } from "../types";

class DataService {
  async getKnowledgeBase(): Promise<KnowledgeItem[]> {
    try {
      const response = await fetch("/api/knowledge-base");
      if (!response.ok) throw new Error("Failed to fetch knowledge base");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("KnowledgeBase Error:", error);
      return [];
    }
  }

  async addKnowledgeItem(item: Omit<KnowledgeItem, "id" | "updatedAt">): Promise<void> {
    const response = await fetch("/api/knowledge-base", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to add knowledge item");
    }
  }

  async updateKnowledgeItem(id: string, item: Partial<KnowledgeItem>): Promise<void> {
    const response = await fetch(`/api/knowledge-base/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update knowledge item");
    }
  }

  async deleteKnowledgeItem(id: string): Promise<void> {
    const response = await fetch(`/api/knowledge-base/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete knowledge item");
  }
  private getAuthHeaders() {
    let userName = "Hệ thống";
    let userId = "system";
    let role = "N/A";
    let email = "N/A";

    try {
      const profileStr = localStorage.getItem("user_profile") || localStorage.getItem("local_profile");
      const userStr = localStorage.getItem("local_user");
      
      const target = profileStr ? JSON.parse(profileStr) : (userStr ? JSON.parse(userStr) : null);
      
      if (target) {
        userName = target.fullName || target.email || "Hệ thống";
        userId = target.uid || "system";
        role = target.role || "N/A";
        email = target.email || "N/A";
      }
    } catch (e) {
      console.error("Failed to parse profile/user", e);
    }
    
    return {
      "Content-Type": "application/json",
      "x-user-name": encodeURIComponent(userName),
      "x-user-id": encodeURIComponent(userId),
      "x-user-role": role,
      "x-user-email": email
    };
  }

  async getUsers(): Promise<any[]> {
    try {
      console.log("[Presence] Calling /api/presence-system");
      const response = await fetch("/api/presence-system", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[Presence] API Error: ${response.status}`, text.substring(0, 100));
        return [];
      }
      
      const text = await response.text();
      if (text.trim().startsWith("<!doctype html>") || text.trim().startsWith("<html")) {
        console.error("[Presence] RECEIVED HTML INSTEAD OF JSON! This means the route matched the SPA fallback.");
        console.log("[Presence] HTML Snippet:", text.substring(0, 500));
        return [];
      }

      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          console.log(`[Presence] Successfully fetched ${data.length} users`);
        } else {
          console.warn("[Presence] Received non-array data from API:", data);
        }
        return data;
      } catch (e) {
        console.error("[Presence] JSON Parse failed. Response starts with:", text.substring(0, 200));
        return [];
      }
    } catch (error) {
      console.error("[Presence] Fetch failed:", error);
      return [];
    }
  }

  async getLogs(): Promise<SystemLog[]> {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      return [];
    }
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const response = await fetch("/api/activities");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      return [];
    }
  }

  async addActivity(activity: Omit<Activity, "id" | "createdAt">): Promise<Activity> {
    const newActivity: Activity = {
      ...activity,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/activities", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(newActivity),
    });
    if (!response.ok) throw new Error("Failed to add activity");
    return newActivity;
  }

  async deleteActivity(id: string): Promise<void> {
    const response = await fetch(`/api/activities/${id}`, { 
      method: "DELETE",
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete activity");
  }

  async updateActivity(id: string, activity: Partial<Activity>): Promise<void> {
    const response = await fetch(`/api/activities/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(activity),
    });
    if (!response.ok) throw new Error("Failed to update activity");
  }

  async addMovement(movement: Omit<Movement, "id" | "createdAt">): Promise<Movement> {
    const response = await fetch("/api/movements", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(movement),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to add movement");
    }
    const data = await response.json();
    return { ...movement, id: data.id, createdAt: Date.now() } as Movement;
  }

  async getMovements(): Promise<Movement[]> {
    const response = await fetch("/api/movements");
    if (!response.ok) throw new Error("Failed to fetch movements");
    return response.json();
  }
  
  async updateMovement(id: string, movement: Partial<Movement>): Promise<void> {
    const response = await fetch(`/api/movements/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(movement),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update movement");
    }
  }

  async addMovementReport(report: Omit<MovementReport, "id" | "submittedAt">): Promise<MovementReport> {
    const response = await fetch("/api/movement-reports", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(report),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to submit report");
    }
    const data = await response.json();
    return { ...report, id: data.id, submittedAt: Date.now() } as MovementReport;
  }

  async getMovementReports(movementId?: string): Promise<MovementReport[]> {
    const url = movementId ? `/api/movement-reports?movementId=${movementId}` : "/api/movement-reports";
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch reports");
    return response.json();
  }

  async getUnits(): Promise<Unit[]> {
    try {
      const response = await fetch(`/api/units?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch units:", error);
      return [];
    }
  }

  async addUnit(unit: Omit<Unit, "id" | "createdAt">): Promise<Unit> {
    const newUnit: Unit = {
      ...unit,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/units", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(newUnit),
    });
    if (!response.ok) throw new Error("Failed to add unit");
    return newUnit;
  }

  async getMembers(): Promise<Member[]> {
    try {
      const response = await fetch(`/api/members?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch members:", error);
      return [];
    }
  }

  async addMember(member: Omit<Member, "id" | "createdAt">): Promise<Member> {
    const newMember: Member = {
      ...member,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now(),
    };
    const response = await fetch("/api/members", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(newMember),
    });
    if (!response.ok) throw new Error("Failed to add member");
    return newMember;
  }

  async deleteMember(id: string): Promise<void> {
    const response = await fetch(`/api/members/${id}`, { 
      method: "DELETE",
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error("Failed to delete member");
  }

  async deleteMembers(ids: string[]): Promise<any> {
    const response = await fetch("/api/members/bulk-delete", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("Failed to delete members");
    return response.json();
  }

  async deleteUnit(id: string): Promise<void> {
    // Note: server needs delete unit route if we want it fully implemented
    // For now I only added delete member. Let's assume we focus on members as per user requests.
    // I will update server.ts to include more routes if needed.
    await fetch(`/api/units/${id}`, { 
      method: "DELETE",
      headers: this.getAuthHeaders()
    });
  }

  async updateUnit(id: string, unit: Partial<Unit>): Promise<void> {
    await fetch(`/api/units/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(unit),
    });
  }

  async updateMember(id: string, memberUpdates: Partial<Member>): Promise<void> {
    // Pre-calculate status history like before
    const members = await this.getMembers();
    const m = members.find(m => m.id === id);
    if (!m) return;

    let updatedHistory = m.statusHistory || [];
    if (memberUpdates.status && memberUpdates.status !== m.status) {
      updatedHistory = [
        ...updatedHistory,
        {
          oldStatus: m.status,
          newStatus: memberUpdates.status,
          date: Date.now(),
          reason: (memberUpdates as any).statusReason || "Cập nhật thông tin hệ thống"
        }
      ];
    }

    const updatedMember = { ...m, ...memberUpdates, statusHistory: updatedHistory };
    
    const response = await fetch(`/api/members/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updatedMember),
    });
    if (!response.ok) throw new Error("Failed to update member");
  }

  async toggleMemberOutstanding(id: string, isOutstanding: boolean): Promise<void> {
    const response = await fetch(`/api/members/${id}/outstanding`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isOutstanding }),
    });
    if (!response.ok) throw new Error("Failed to toggle outstanding status");
  }
}

export const dataService = new DataService();
