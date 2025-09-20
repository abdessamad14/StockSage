import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useOfflineUsers } from '@/hooks/use-offline-users';
import { useI18n } from '@/lib/i18n';
import { OfflineUser } from '@/lib/user-storage';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck, 
  User,
  Eye,
  EyeOff
} from 'lucide-react';

export default function UserManagement() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { users, createUser, updateUser, deleteUser } = useOfflineUsers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<OfflineUser | null>(null);
  const [showPins, setShowPins] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    pin: '',
    role: 'cashier' as 'admin' | 'cashier',
    active: true,
  });

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      pin: '',
      role: 'cashier',
      active: true,
    });
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.name || !formData.pin) {
      toast({
        title: t('user_management_required_fields'),
        description: t('user_management_required_fields_message'),
        variant: "destructive",
      });
      return;
    }

    if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
      toast({
        title: t('user_management_invalid_pin'),
        description: t('user_management_invalid_pin_message'),
        variant: "destructive",
      });
      return;
    }

    try {
      await createUser({
        username: formData.username,
        name: formData.name,
        pin: formData.pin,
        role: formData.role,
        active: formData.active,
      });

      toast({
        title: t('success'),
        description: t('user_management_create_success', { name: formData.name }),
      });
      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('create_user_error'),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: OfflineUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      pin: user.pin || '',
      role: user.role,
      active: user.active,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    if (!formData.username || !formData.name || !formData.pin) {
      toast({
        title: t('user_management_required_fields'),
        description: t('user_management_required_fields_message'),
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUser(editingUser.id, {
        username: formData.username,
        name: formData.name,
        pin: formData.pin,
        role: formData.role,
        active: formData.active,
      });

      toast({
        title: t('success'),
        description: t('user_management_update_success', { name: formData.name }),
      });
      resetForm();
      setIsEditOpen(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('update_user_error'),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast({
        title: t('success'),
        description: t('user_deleted'),
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('delete_user_error'),
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'cashier':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'cashier':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t('user_management')}
          </h1>
          <p className="text-gray-600">{t('user_management_description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPins(!showPins)}
          >
            {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPins ? t('user_management_hide_pins') : t('user_management_show_pins')}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('new_user')}
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {users.map((user: OfflineUser) => (
          <Card key={user.id} className={!user.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role === 'admin' ? t('admin') : t('cashier')}
                      </Badge>
                      {!user.active && (
                        <Badge variant="secondary">{t('inactive')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                    {showPins && user.pin && (
                      <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                        {t('pin')}: {user.pin}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                    disabled={user.role === 'admin' && users.filter((u: OfflineUser) => u.role === 'admin' && u.active).length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">{t('username')} *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={t('username_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="name">{t('full_name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('full_name_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="pin">{t('pin_code_label')} *</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder={t('pin_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="role">{t('role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'cashier') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{t('cashier')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">{t('active_account')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleCreate}>
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">{t('username')} *</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={t('username_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="edit-name">{t('full_name')} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('full_name_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="edit-pin">{t('pin_code_label')} *</Label>
              <Input
                id="edit-pin"
                type="password"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder={t('pin_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">{t('role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'cashier') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{t('cashier')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="edit-active">{t('active_account')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleUpdate}>
              {t('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
