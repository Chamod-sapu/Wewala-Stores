import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User as UserIcon,
  MapPin,
  Package,
  Heart,
  Shield,
  Camera,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  LogOut,
  Phone,
  Mail,
  Calendar,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/store/cartStore';
import { supabase } from '@/lib/supabase';
import {
  STORE_CONFIG,
  ORDER_STATUSES,
  STORAGE_BUCKETS,
  OrderStatus,
  Address,
  Product,
} from '@wewala/shared';

// Form Schemas
const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(9, 'Phone must be at least 9 digits').or(z.literal('')),
});

const addressFormSchema = z.object({
  recipient_name: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(9, 'Valid phone number is required'),
  street_address: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  postal_code: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  is_default: z.boolean(),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type AddressFormData = z.infer<typeof addressFormSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type TabKey = 'profile' | 'addresses' | 'orders' | 'wishlist' | 'security';

interface OrderSummaryItem {
  id: string;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  order_items?: OrderSummaryItem[];
}

interface WishlistProduct extends Product {
  images?: { url: string; sort_order: number }[];
}

interface WishlistRecord {
  id: string;
  product_id: string;
  created_at: string;
  product?: WishlistProduct;
}

export default function AccountPage() {
  const { user, profile, updateProfile, updatePassword, signOut } = useAuth();
  const { addItem } = useCartStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state
  const activeTab = (searchParams.get('tab') as TabKey) || 'profile';
  const setActiveTab = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  // Profile States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Address States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Orders States
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Wishlist States
  const [wishlistItems, setWishlistItems] = useState<WishlistRecord[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forms
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      recipient_name: '',
      phone: '',
      street_address: '',
      city: '',
      postal_code: '',
      country: STORE_CONFIG.defaultCountry,
      is_default: false,
    },
  });

  const securityForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Fetch Addresses
  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setAddresses((data as Address[]) || []);
    } catch (err: any) {
      console.warn('Error fetching addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as OrderRecord[]) || []);
    } catch (err: any) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch Wishlist
  const fetchWishlist = async () => {
    if (!user) return;
    setLoadingWishlist(true);
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('id, product_id, created_at, product:products(*, images:product_images(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlistItems((data as unknown as WishlistRecord[]) || []);
    } catch (err: any) {
      console.warn('Error fetching wishlist:', err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'wishlist') fetchWishlist();
  }, [activeTab, user]);

  // Handle Profile Update
  const handleProfileSubmit = async (data: ProfileFormData) => {
    const { error } = await updateProfile({
      full_name: data.fullName,
      phone: data.phone,
    });

    if (error) {
      toast.error(error);
    } else {
      toast.success('Profile updated successfully!');
    }
  };

  // Handle Avatar File Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size must be less than 5 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKETS.AVATARS)
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;
      const { error: profileErr } = await updateProfile({ avatar_url: avatarUrl });
      if (profileErr) throw new Error(profileErr);

      toast.success('Avatar updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Could not upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Address Save (Create or Update)
  const handleAddressSubmit = async (data: AddressFormData) => {
    if (!user) return;

    try {
      if (data.is_default) {
        // Clear previous default
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (editingAddress) {
        // Update existing
        const { error } = await supabase
          .from('addresses')
          .update({
            recipient_name: data.recipient_name,
            phone: data.phone,
            street_address: data.street_address,
            city: data.city,
            postal_code: data.postal_code,
            country: data.country,
            is_default: data.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAddress.id);

        if (error) throw error;
        toast.success('Address updated successfully!');
      } else {
        // Create new
        const { error } = await supabase.from('addresses').insert({
          user_id: user.id,
          recipient_name: data.recipient_name,
          phone: data.phone,
          street_address: data.street_address,
          city: data.city,
          postal_code: data.postal_code,
          country: data.country,
          is_default: data.is_default || addresses.length === 0,
        });

        if (error) throw error;
        toast.success('New address added!');
      }

      setIsAddressModalOpen(false);
      setEditingAddress(null);
      addressForm.reset();
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address.');
    }
  };

  // Set Address as Default
  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;
    try {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', addressId);
      toast.success('Default address updated!');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Could not set default address.');
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', addressId);
      if (error) throw error;
      toast.success('Address removed.');
      fetchAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete address.');
    }
  };

  // Open Edit Address Modal
  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    addressForm.reset({
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      street_address: addr.street_address,
      city: addr.city,
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default,
    });
    setIsAddressModalOpen(true);
  };

  // Remove Wishlist Item
  const handleRemoveWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase.from('wishlist').delete().eq('id', wishlistId);
      if (error) throw error;
      setWishlistItems((prev) => prev.filter((item) => item.id !== wishlistId));
      toast.success('Item removed from wishlist');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove item from wishlist.');
    }
  };

  // Add Wishlist Item to Cart
  const handleAddToCart = (product?: WishlistProduct) => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error('Sorry, this product is currently out of stock.');
      return;
    }

    const firstImage = product.images?.[0]?.url || null;
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock: product.stock,
      imageUrl: firstImage,
      sku: product.sku,
    });

    toast.success(`"${product.name}" added to your cart!`);
  };

  // Handle Password Update
  const handlePasswordSubmit = async (data: PasswordFormData) => {
    const { error } = await updatePassword(data.newPassword);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Your password has been changed successfully!');
      securityForm.reset();
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  return (
    <ProtectedRoute>
      <div className="section-container py-10 lg:py-14">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              My Account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your personal profile, addresses, orders, and security settings
            </p>
          </div>

          <button
            onClick={() => signOut()}
            className="btn-ghost text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3">
            <div className="card p-5 space-y-6 sticky top-24">
              {/* User Avatar Summary Card */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-500"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-white text-sm">
                    {profile?.full_name || 'Valued Customer'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <UserIcon size={18} /> Profile
                </button>

                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeTab === 'addresses'
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <MapPin size={18} /> Addresses
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeTab === 'orders'
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Package size={18} /> My Orders
                  </span>
                  {orders.length > 0 && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {orders.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('wishlist')}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeTab === 'wishlist'
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Heart size={18} /> Wishlist
                  </span>
                  {wishlistItems.length > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      {wishlistItems.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    activeTab === 'security'
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <Shield size={18} /> Security
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Main Content */}
          <div className="lg:col-span-9">
            {/* ============================================================== */}
            {/* TAB 1: PROFILE & AVATAR UPLOAD                                 */}
            {/* ============================================================== */}
            {activeTab === 'profile' && (
              <div className="card p-6 md:p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Information</h2>
                  <p className="text-sm text-slate-500">Update your photo and personal contact details</p>
                </div>

                {/* Avatar Section */}
                <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="relative group">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'Avatar'}
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-md dark:ring-slate-800"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 font-extrabold text-brand-700 text-3xl ring-4 ring-white shadow-md dark:bg-brand-950 dark:text-brand-300 dark:ring-slate-800">
                        {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white">
                        <Loader2 className="animate-spin" size={24} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Profile Avatar</h3>
                    <p className="text-xs text-slate-500">
                      Supports PNG, JPG, or WEBP up to 5 MB. Stored in Supabase Storage.
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs inline-flex items-center gap-1.5"
                      >
                        <Camera size={14} /> Change Avatar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Profile Edit Form */}
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <UserIcon size={14} className="text-slate-400" /> Full Name *
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ayasha Fernando"
                        {...profileForm.register('fullName')}
                      />
                      {profileForm.formState.errors.fullName && (
                        <p className="error-text mt-1">
                          {profileForm.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label mb-1.5 flex items-center gap-1.5">
                        <Phone size={14} className="text-slate-400" /> Phone Number
                      </label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="077 123 4567"
                        {...profileForm.register('phone')}
                      />
                      {profileForm.formState.errors.phone && (
                        <p className="error-text mt-1">{profileForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="label mb-1.5 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400" /> Account Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="input bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Primary email linked with Supabase Authentication.
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar size={14} /> Member since{' '}
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : 'Recently'}
                    </div>

                    <button
                      type="submit"
                      disabled={profileForm.formState.isSubmitting}
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      {profileForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={16} /> Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: ADDRESSES (CRUD + DEFAULT)                              */}
            {/* ============================================================== */}
            {activeTab === 'addresses' && (
              <div className="card p-6 md:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shipping Addresses</h2>
                    <p className="text-sm text-slate-500">Manage delivery locations for fast checkout</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingAddress(null);
                      addressForm.reset({
                        recipient_name: profile?.full_name || '',
                        phone: profile?.phone || '',
                        street_address: '',
                        city: '',
                        postal_code: '',
                        country: STORE_CONFIG.defaultCountry,
                        is_default: addresses.length === 0,
                      });
                      setIsAddressModalOpen(true);
                    }}
                    className="btn-primary text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Add New Address
                  </button>
                </div>

                {loadingAddresses ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-36 rounded-xl" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <MapPin size={28} />
                    </div>
                    <h3 className="mt-4 font-bold text-slate-900 dark:text-white">No addresses saved</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Add a shipping address to speed up your future orders.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`relative rounded-xl border p-5 transition-all ${
                          addr.is_default
                            ? 'border-brand-500 bg-brand-50/20 shadow-sm dark:border-brand-600 dark:bg-brand-950/10'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            {addr.recipient_name}
                          </h4>
                          {addr.is_default && (
                            <span className="badge-brand text-[10px] font-bold">Default</span>
                          )}
                        </div>

                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                          <p>{addr.street_address}</p>
                          <p>
                            {addr.city}, {addr.postal_code}
                          </p>
                          <p>{addr.country}</p>
                          <p className="pt-1 font-medium text-slate-700 dark:text-slate-300">
                            📞 {addr.phone}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div>
                            {!addr.is_default && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                              >
                                Set as default
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(addr)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                              title="Edit address"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700"
                              title="Delete address"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: MY ORDERS WITH STATUS FILTER                            */}
            {/* ============================================================== */}
            {activeTab === 'orders' && (
              <div className="card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order History</h2>
                  <p className="text-sm text-slate-500">Track and view invoices for all your purchases</p>
                </div>

                {/* Status Filter Badges */}
                <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                  {['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                          statusFilter === status
                            ? 'bg-brand-600 text-white dark:bg-brand-500'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                        }`}
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>

                {loadingOrders ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Package size={28} />
                    </div>
                    <h3 className="mt-4 font-bold text-slate-900 dark:text-white">No orders found</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {statusFilter === 'all'
                        ? "You haven't placed any orders yet."
                        : `No orders matching status "${statusFilter}".`}
                    </p>
                    <div className="mt-5">
                      <Link to="/products" className="btn-primary text-xs">
                        Start Shopping
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                      const statusConf = ORDER_STATUSES[order.status] || {
                        label: order.status,
                        color: 'blue',
                      };
                      return (
                        <div
                          key={order.id}
                          className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                Order #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="ml-3 text-xs text-slate-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`badge text-xs font-semibold px-2.5 py-0.5 capitalize ${
                                  order.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : order.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                                }`}
                              >
                                {statusConf.label}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {order.order_items?.length || 0} item(s) • Payment:{' '}
                                <span className="uppercase">{order.payment_method}</span> (
                                {order.payment_status})
                              </p>
                              <p className="mt-0.5 truncate text-slate-500 max-w-md">
                                {order.order_items
                                  ?.map((i) => `${i.name_snapshot} (${i.quantity})`)
                                  .join(', ')}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[11px] text-slate-400">Total Amount</p>
                                <p className="text-base font-extrabold text-slate-900 dark:text-white">
                                  {STORE_CONFIG.currencySymbol} {order.total.toLocaleString()}
                                </p>
                              </div>

                              <Link
                                to={`/orders/${order.id}`}
                                className="btn-secondary text-xs inline-flex items-center gap-1.5"
                              >
                                View Order <ArrowRight size={14} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: WISHLIST                                                */}
            {/* ============================================================== */}
            {activeTab === 'wishlist' && (
              <div className="card p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Wishlist</h2>
                  <p className="text-sm text-slate-500">Products you've saved for later</p>
                </div>

                {loadingWishlist ? (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <Skeleton className="h-56 rounded-xl" />
                    <Skeleton className="h-56 rounded-xl" />
                    <Skeleton className="h-56 rounded-xl" />
                  </div>
                ) : wishlistItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/40">
                      <Heart size={28} />
                    </div>
                    <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Your wishlist is empty</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Tap the heart icon on any product to save it here.
                    </p>
                    <div className="mt-5">
                      <Link to="/products" className="btn-primary text-xs">
                        Explore Store Products
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {wishlistItems.map((item) => {
                      const prod = item.product;
                      if (!prod) return null;
                      const imageUrl = prod.images?.[0]?.url;

                      return (
                        <div
                          key={item.id}
                          className="group rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        >
                          <div>
                            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={prod.name}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                  No image
                                </div>
                              )}

                              <button
                                onClick={() => handleRemoveWishlist(item.id)}
                                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow hover:text-rose-600 dark:bg-slate-900/90 dark:hover:text-rose-400"
                                title="Remove from wishlist"
                              >
                                <Trash2 size={13} className="sm:hidden" />
                                <Trash2 size={14} className="hidden sm:block" />
                              </button>
                            </div>

                            <div className="mt-2 sm:mt-3">
                              <Link
                                to={`/products/${prod.slug}`}
                                className="font-semibold text-xs sm:text-sm text-slate-900 hover:text-brand-600 dark:text-white line-clamp-1"
                              >
                                {prod.name}
                              </Link>
                              <div className="mt-1 flex items-baseline gap-1.5 sm:gap-2">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {STORE_CONFIG.currencySymbol} {prod.price.toLocaleString()}
                                </span>
                                {prod.compare_at_price && prod.compare_at_price > prod.price && (
                                  <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                                    {STORE_CONFIG.currencySymbol}{' '}
                                    {prod.compare_at_price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button
                              onClick={() => handleAddToCart(prod)}
                              disabled={prod.stock <= 0}
                              className="btn-primary w-full text-xs py-1.5 sm:py-2 inline-flex items-center justify-center gap-1.5"
                              title={prod.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                            >
                              <ShoppingBag size={14} />{' '}
                              <span className="hidden sm:inline">
                                {prod.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: SECURITY (CHANGE PASSWORD)                              */}
            {/* ============================================================== */}
            {activeTab === 'security' && (
              <div className="card p-6 md:p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security & Password</h2>
                  <p className="text-sm text-slate-500">Manage credentials to keep your account safe</p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <Shield className="text-brand-600" size={22} />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Authenticated with Supabase Auth
                      </h4>
                      <p className="text-xs text-slate-500">
                        Passwords are encrypted using Argon2/bcrypt standards with token rotation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password Change Form */}
                <form
                  onSubmit={securityForm.handleSubmit(handlePasswordSubmit)}
                  className="space-y-5 max-w-md"
                >
                  <div>
                    <label className="label mb-1.5">New Password (min 8 characters)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="input pr-10"
                        {...securityForm.register('newPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {securityForm.formState.errors.newPassword && (
                      <p className="error-text mt-1">
                        {securityForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="input pr-10"
                        {...securityForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {securityForm.formState.errors.confirmPassword && (
                      <p className="error-text mt-1">
                        {securityForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={securityForm.formState.isSubmitting}
                    className="btn-primary inline-flex items-center gap-2 text-sm"
                  >
                    {securityForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* ADDRESS MODAL (ADD / EDIT)                                     */}
        {/* ============================================================== */}
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingAddress ? 'Edit Shipping Address' : 'Add New Address'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Kasun Perera"
                      {...addressForm.register('recipient_name')}
                    />
                    {addressForm.formState.errors.recipient_name && (
                      <p className="error-text mt-1">
                        {addressForm.formState.errors.recipient_name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="077 123 4567"
                      {...addressForm.register('phone')}
                    />
                    {addressForm.formState.errors.phone && (
                      <p className="error-text mt-1">{addressForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label mb-1">Street Address *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="No. 45, Temple Road"
                    {...addressForm.register('street_address')}
                  />
                  {addressForm.formState.errors.street_address && (
                    <p className="error-text mt-1">
                      {addressForm.formState.errors.street_address.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label mb-1">City *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Maharagama"
                      {...addressForm.register('city')}
                    />
                    {addressForm.formState.errors.city && (
                      <p className="error-text mt-1">{addressForm.formState.errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="label mb-1">Postal Code *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="10280"
                      {...addressForm.register('postal_code')}
                    />
                    {addressForm.formState.errors.postal_code && (
                      <p className="error-text mt-1">
                        {addressForm.formState.errors.postal_code.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label mb-1">Country</label>
                    <input
                      type="text"
                      className="input bg-slate-50 dark:bg-slate-800"
                      readOnly
                      {...addressForm.register('country')}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      {...addressForm.register('is_default')}
                    />
                    Set as my default shipping address
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressForm.formState.isSubmitting}
                    className="btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    {addressForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Saving...
                      </>
                    ) : (
                      'Save Address'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
