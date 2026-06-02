import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/lib/api';
import { useCreateUser } from '@/hooks/useUsers';
import type { UserCreate } from '@/types/users';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Mirrors the server's UserCreate rules (#61) so client validation matches.
const schema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(100, 'Username must be 100 characters or fewer')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Only letters, numbers, underscores and hyphens',
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[0-9]/, 'Must include a digit'),
    confirm_password: z.string().min(1, 'Please confirm the password'),
    first_name: z.string().max(100, 'Too long').optional(),
    last_name: z.string().max(100, 'Too long').optional(),
    date_of_birth: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  email: '',
  username: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
};

export function CreateUserForm() {
  const createUser = useCreateUser();
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    setCreated(null);

    const payload: UserCreate = {
      email: values.email,
      username: values.username,
      password: values.password,
      confirm_password: values.confirm_password,
      ...(values.first_name ? { first_name: values.first_name } : {}),
      ...(values.last_name ? { last_name: values.last_name } : {}),
      ...(values.date_of_birth ? { date_of_birth: values.date_of_birth } : {}),
    };

    try {
      const user = await createUser.mutateAsync(payload);
      setCreated(user.username);
      form.reset(DEFAULTS);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.message;
        if (err.status === 400 && /email/i.test(detail)) {
          form.setError('email', { message: detail });
        } else if (err.status === 400 && /username/i.test(detail)) {
          form.setError('username', { message: detail });
        } else if (err.status === 422) {
          setFormError(
            typeof detail === 'string'
              ? detail
              : 'Validation failed — please check the fields.',
          );
        } else if (err.status === 403) {
          setFormError('Admin access required to create users.');
        } else {
          setFormError(detail || 'Something went wrong. Please try again.');
        }
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        // A fresh success message should clear once the admin edits again.
        onChange={() => created && setCreated(null)}
      >
        {created && (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            User <span className="font-medium">{created}</span> created. They can
            now sign in.
          </div>
        )}
        {formError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="janedoe" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormDescription>
                  Min 8 chars, with upper, lower &amp; a digit.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date_of_birth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating...' : 'Create user'}
        </Button>
      </form>
    </Form>
  );
}
