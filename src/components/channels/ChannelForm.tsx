import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { Channel, CreateChannelData } from '../../services/channels';
import type { AmazonAccount } from '../../services/accounts';
import { Button, Input } from '../ui';

interface ChannelFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateChannelData) => Promise<void>;
  channel?: Channel | null;
  amazonAccounts: AmazonAccount[];
}

export const ChannelForm: React.FC<ChannelFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  channel,
  amazonAccounts,
}) => {
  const [formData, setFormData] = useState<CreateChannelData>({
    channel_name: '',
    channel_type: 'amazon',
    status: 'pending',
    amazon_account: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (channel) {
      setFormData({
        channel_name: channel.channel_name,
        channel_type: channel.channel_type,
        status: channel.status,
        amazon_account: channel.amazon_account,
      });
    } else {
      setFormData({
        channel_name: '',
        channel_type: 'amazon',
        status: 'pending',
        amazon_account: amazonAccounts.length > 0 ? amazonAccounts[0].id : null,
      });
    }
  }, [channel, amazonAccounts]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'amazon_account' ? (value ? parseInt(value) : null) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(formData);
      setFormData({
        channel_name: '',
        channel_type: 'amazon',
        status: 'pending',
        amazon_account: null,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-h1100 font-semibold text-forest-f60 mb-4">
                  {channel ? 'Edit Channel' : 'Create New Channel'}
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Channel Name"
                    name="channel_name"
                    value={formData.channel_name}
                    onChange={handleChange}
                    required
                    placeholder="My Channel"
                  />

                  <div>
                    <label className="block text-h800 text-forest-f60 mb-1.5 font-medium">
                      Channel Type
                    </label>
                    <select
                      name="channel_type"
                      value={formData.channel_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-sandstorm-s5 border border-sandstorm-s50 rounded-lg text-h800 text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                    >
                      <option value="amazon">Amazon</option>
                      <option value="google">Google</option>
                    </select>
                  </div>

                  {formData.channel_type === 'amazon' && amazonAccounts.length > 0 && (
                    <div>
                      <label className="block text-h800 text-forest-f60 mb-1.5 font-medium">
                        Amazon Account
                      </label>
                      <select
                        name="amazon_account"
                        value={formData.amazon_account || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-sandstorm-s5 border border-sandstorm-s50 rounded-lg text-h800 text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                      >
                        <option value="">Select an account</option>
                        {amazonAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name ?? account.account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-h800 text-forest-f60 mb-1.5 font-medium">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-sandstorm-s5 border border-sandstorm-s50 rounded-lg text-h800 text-forest-f60 focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? 'Saving...' : channel ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

