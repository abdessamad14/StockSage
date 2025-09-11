import { useState, useEffect } from 'react';
import { databaseUserStorage } from '@/lib/database-user-storage';
import { OfflineUser } from '@/lib/user-storage';

export function useOfflineUsers() {
  const [users, setUsers] = useState<OfflineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await databaseUserStorage.getAll();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (userData: Omit<OfflineUser, 'id'>) => {
    try {
      const newUser = await databaseUserStorage.create(userData);
      await loadUsers(); // Refresh the list
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, updates: Partial<OfflineUser>) => {
    try {
      const updatedUser = await databaseUserStorage.update(id, updates);
      await loadUsers(); // Refresh the list
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const success = await databaseUserStorage.delete(id);
      if (success) {
        await loadUsers(); // Refresh the list
      }
      return success;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers: loadUsers,
  };
}
