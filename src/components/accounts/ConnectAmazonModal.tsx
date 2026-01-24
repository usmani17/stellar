import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button, Input } from '../ui';
import { accountsService } from '../../services/accounts';

interface ConnectAmazonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; amazon_account_id?: string }) => Promise<void>;
  onOAuthSuccess?: () => void;
}

export const ConnectAmazonModal: React.FC<ConnectAmazonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOAuthSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    amazon_account_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        amazon_account_id: formData.amazon_account_id || undefined,
      });
      setFormData({ name: '', amazon_account_id: '' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect account');
    } finally {
      setLoading(false);
    }
  };

  const handleAmazonOAuth = async () => {
    setError('');
    setOauthLoading(true);

    try {
      const { auth_url } = await accountsService.initiateAmazonOAuth();
      // Redirect to Amazon OAuth
      window.location.href = auth_url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate Amazon OAuth');
      setOauthLoading(false);
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
                <Dialog.Title as="h3" className="text-[24px] font-medium text-[#072929] mb-4">
                  Connect Amazon Account
                </Dialog.Title>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-[14px] mb-4">
                    {error}
                  </div>
                )}

                {/* Amazon OAuth Button */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={handleAmazonOAuth}
                    disabled={oauthLoading}
                    className="w-full h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-[#F0F0ED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-[#FF9900] rounded">
                      <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <span className="text-[16px] text-black font-medium">
                      {oauthLoading ? 'Redirecting to Amazon...' : 'Connect with Amazon'}
                    </span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-[14px] font-medium text-black">or</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* Manual Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Brand Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="My Amazon Account"
                  />

                  <Input
                    label="Amazon Account ID (Optional)"
                    name="amazon_account_id"
                    value={formData.amazon_account_id}
                    onChange={handleChange}
                    placeholder="Enter Amazon Account ID"
                  />

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
                      {loading ? 'Connecting...' : 'Connect'}
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

