import { useState } from 'react';
import { Profile } from '../../types/profile';
import Modal from '../common/Modal';

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

  const eligibleMembers = members.filter(member => member.id !== currentOwnerId);
  const selectedMember = eligibleMembers.find(member => member.id === selectedMemberId);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Ownership"
      subtitle={`Pass control of "${watchlistTitle}" to another member`}
    >
      <div className="space-y-4">
        {!showConfirmation ? (
          <>
            {eligibleMembers.length === 0 ? (
              <p className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                No other members available to transfer ownership to.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {eligibleMembers.map((member) => {
                  const isSelected = selectedMemberId === member.id;
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? 'border-red-500 bg-red-500/10 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="h-8 w-8 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-red-600/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                            {member.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-sm">{member.display_name}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
              <strong className="block mb-1 text-sm font-bold">Warning</strong>
              Transferring ownership cannot be undone. You will become an editor of this list and <span className="font-bold">{selectedMember?.display_name}</span> will become the owner.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3">
          {!showConfirmation ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedMemberId || eligibleMembers.length === 0}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-600/20 transition-all"
              >
                Confirm Transfer
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default TransferOwnershipModal;
