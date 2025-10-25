import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { User, Upload, Camera } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ProfileViewProps {
  profile: any;
  onProfileUpdate: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onProfileUpdate }) => {
  const { accessToken } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/profile/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ name })
        }
      );

      if (response.ok) {
        toast.success('Profile updated successfully!');
        onProfileUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d40630a2/profile/upload-picture`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      );

      if (response.ok) {
        toast.success('Profile picture uploaded successfully!');
        onProfileUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload picture');
      }
    } catch (error) {
      console.error('Failed to upload picture:', error);
      toast.error('Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-purple-200">Profile Settings</h2>
        <p className="text-purple-300/70 text-sm mt-1">Manage your account information</p>
      </div>

      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">Profile Picture</CardTitle>
          <CardDescription className="text-purple-300/70">
            Upload a profile picture to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-purple-500/30">
                <AvatarImage src={profile?.profilePicture} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-2xl">
                  {profile?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="picture-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center cursor-pointer border-2 border-gray-900 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadPicture}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <p className="text-purple-200 mb-1">{profile?.name}</p>
              <p className="text-purple-300/70 text-sm mb-3">{profile?.email}</p>
              {uploading && (
                <p className="text-purple-300 text-sm">Uploading...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">Account Information</CardTitle>
          <CardDescription className="text-purple-300/70">
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-purple-200">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-gray-800 border-purple-500/30 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-200">Email</Label>
              <Input
                id="email"
                value={profile?.email}
                disabled
                className="bg-gray-800/50 border-purple-500/20 text-gray-400"
              />
              <p className="text-xs text-purple-300/60">Email cannot be changed</p>
            </div>

            <Button
              type="submit"
              disabled={updating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/90 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-purple-200">Account Stats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-300/70 text-sm mb-1">Groups Joined</p>
            <p className="text-purple-200 text-2xl">{profile?.groups?.length || 0}</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-300/70 text-sm mb-1">Reward Points</p>
            <p className="text-purple-200 text-2xl">{profile?.rewards?.points || 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
