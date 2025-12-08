import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Button, Input } from '../ui';

interface ConnectAmazonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { account_name: string; amazon_account_id?: string }) => Promise<void>;
}

export const ConnectAmazonModal: React.FC<ConnectAmazonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    account_name: '',
    amazon_account_id: '',
  });
  const [loading, setLoading] = useState(false);
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
        account_name: formData.account_name,
        amazon_account_id: formData.amazon_account_id || undefined,
      });
      setFormData({ account_name: '', amazon_account_id: '' });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect account');
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
                  Connect Amazon Account
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700">
                      {error}
                    </div>
                  )}

                  <Input
                    label="Account Name"
                    name="account_name"
                    value={formData.account_name}
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

