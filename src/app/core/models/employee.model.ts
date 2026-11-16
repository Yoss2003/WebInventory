export interface EmployeeUser {
  id: number;
  username: string;
  email: string;
  profilePictureUrl?: string | null;
}

export interface Employee {
  id: number;
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  dni?: string | null;
  age?: number | null;
  birthDate?: string | null;
  jobPositionId?: number | null;
  areaId?: number | null;
  hireDate?: string | null;
  contractTypeId?: number | null;
  statusId?: number;
  companyId: number;
  isActive: boolean;
  pictureUrl?: string | null;
  user?: EmployeeUser | null;
}
