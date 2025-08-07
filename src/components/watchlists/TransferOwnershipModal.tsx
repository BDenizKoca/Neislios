import { useState } from 'react';
import { Profile } from '../../types/profile';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (newOwnerId: string) => void;
  members: Profile[];
  currentOwnerId: string;
  watchlistTitle: string;
}

function TransferOwnershipModal({
  isOpen,
  onClose,
  onTransfer,
  members,
  currentOwnerId,
  watchlistTitle
}: TransferOwnershipModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter out the current owner from the list
  const eligibleMembers = members.filter(member => member.id !== currentOwnerId);
  const selectedMember = eligibleMembers.find(member => member.id === selectedMemberId);

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
  };

  const handleContinue = () => {
    if (selectedMemberId) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmTransfer = () => {
    if (selectedMemberId) {
      onTransfer(selectedMemberId);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedMemberId(null);
    setShowConfirmation(false);
    onClose();
  };

  const handleBack = () => {
    setShowConfirmation(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <UserGroupIcon className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transfer Ownership
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showConfirmation ? (
            /* Member Selection */
            <>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a member to transfer ownership of "<span className="font-medium">{watchlistTitle}</span>" to:
              </p>
              
              {eligibleMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No other members available to transfer ownership to.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {eligibleMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedMemberId === member.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {member.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {member.display_name}
                        </span>
                        {selectedMemberId === member.id && (
                          <div className="ml-auto">
                            <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Confirmation */
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 mb-4">
                <UserGroupIcon className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Confirm Transfer
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to transfer ownership of "<span className="font-medium">{watchlistTitle}</span>" to{' '}
                <span className="font-medium text-orange-600">{selectedMember?.display_name}</span>?
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Warning:</strong> This action cannot be undone. You will become an editor of this list.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
          {!showConfirmation ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedMemberId || eligibleMembers.length === 0}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md font-medium"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handleConfirmTransfer}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Transfer Ownership
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransferOwnershipModal;
