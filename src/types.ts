export type UserRole = "admin" | "secretary";

export interface SearchPreset {
  id: string;
  name: string;
  filters: {
    unit: string;
    status: string;
    academicYear: string;
    achievement: string;
    searchTerm: string;
    hometown: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  unitId?: string;
  presets?: SearchPreset[];
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: number;
}

export interface StatusChange {
  oldStatus: string;
  newStatus: string;
  date: number;
  reason?: string;
}

export interface Member {
  id: string;
  fullName: string;
  memberId: string;
  dob: string;
  gender: "Nam" | "Nữ" | "Khác";
  ethnic?: string;
  hometown?: string;
  joinDate?: string;
  unitId: string;
  email?: string;
  phone?: string;
  academicYear?: string;
  achievementLevel?: "Xuất sắc" | "Khá" | "Trung bình" | "Chưa xếp loại";
  status: "Đang sinh hoạt" | "Đã chuyển sinh hoạt" | "Đã trưởng thành" | "Bị kỷ luật";
  statusHistory?: StatusChange[];
  createdAt: number;
}
