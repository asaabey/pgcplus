import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        // Check username
        if (credentials.username !== adminUsername) {
          return null;
        }

        // Check password (plain text comparison for now, but can be hashed)
        if (credentials.password !== adminPassword) {
          return null;
        }

        // Return user object
        return {
          id: '1',
          name: adminUsername,
          email: `${adminUsername}@pgcplus.local`,
        };
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDocuments = nextUrl.pathname.startsWith('/documents');

      if (isOnDocuments) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
