import { Unit, Member } from "../types";

// Mock data
const MOCK_UNITS: Unit[] = [
  { id: "1", code: "CD01", name: "Chi đoàn Lớp CNTT K44", address: "Đại học Đà Lạt", phone: "0123456789", createdAt: Date.now() },
  { id: "2", code: "CD02", name: "Chi đoàn Lớp Toán K44", address: "Đại học Đà Lạt", phone: "0987654321", createdAt: Date.now() },
];

const MOCK_MEMBERS: Member[] = [
  { 
    id: "m1", 
    fullName: "Nguyễn Văn A", 
    memberId: "SV001", 
    dob: "2003-01-01", 
    gender: "Nam", 
    unitId: "1", 
    status: "Đang sinh hoạt",
    createdAt: Date.now()
  },
  { 
    id: "m2", 
    fullName: "Trần Thị B", 
    memberId: "SV002", 
    dob: "2003-05-15", 
    gender: "Nữ", 
    unitId: "1", 
    status: "Đang sinh hoạt",
    createdAt: Date.now()
  },
  { 
    id: "m3", 
    fullName: "Lê Văn C", 
    memberId: "SV003", 
    dob: "2002-11-20", 
    gender: "Nam", 
    unitId: "2", 
    status: "Đã trưởng thành",
    createdAt: Date.now()
  },
];

class DataService {
  private units: Unit[] = [...MOCK_UNITS];
  private members: Member[] = [...MOCK_MEMBERS];

  getUnits() {
    return Promise.resolve(this.units);
  }

  addUnit(unit: Omit<Unit, "id" | "createdAt">) {
    const newUnit: Unit = {
      ...unit,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    this.units.push(newUnit);
    return Promise.resolve(newUnit);
  }

  getMembers() {
    return Promise.resolve(this.members);
  }

  addMember(member: Omit<Member, "id" | "createdAt">) {
    const newMember: Member = {
      ...member,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    this.members.push(newMember);
    return Promise.resolve(newMember);
  }

  deleteMember(id: string) {
    this.members = this.members.filter(m => m.id !== id);
    return Promise.resolve();
  }

  deleteUnit(id: string) {
    this.units = this.units.filter(u => u.id !== id);
    return Promise.resolve();
  }

  updateUnit(id: string, unit: Partial<Unit>) {
    this.units = this.units.map(u => u.id === id ? { ...u, ...unit } : u);
    return Promise.resolve();
  }

  updateMember(id: string, memberUpdates: Partial<Member>) {
    this.members = this.members.map(m => {
      if (m.id === id) {
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
        return { ...m, ...memberUpdates, statusHistory: updatedHistory } as Member;
      }
      return m;
    });
    return Promise.resolve();
  }
}

export const dataService = new DataService();
