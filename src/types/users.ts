/** POST /users/ body — admin-only user provisioning (backend #61). */
export interface UserCreate {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
}
