import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DailyRecord } from '../types';
import { getRecordByDate } from '../services/storage';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: DailyRecord) => void;
  initialDate?: string;
}

const emptyRecord: DailyRecord = {
  id: '',
  date: new Date().toISOString().split('T')[0],
  gmv: 0,
  cogs: 0,
  ads: 0,
  shipping: 0,
  platformFees: 0,
  otherCosts: 0,
  refundsOnly: 0,
  returns: 0,
};

const RecordModal: React.FC<RecordModalProps> = ({ isOpen, onClose, onSave, initialDate }) => {
  const [formData, setFormData] = useState<DailyRecord>(emptyRecord);

  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate || new Date().toISOString().split('T')[0];
      const existing = getRecordByDate(dateToUse);
      if (existing) {
        setFormData(existing);
      } else {
        setFormData({ ...emptyRecord, date: dateToUse, id: Date.now().toString() });
      }
    }
  }, [isOpen, initialDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'date') {
       // If date changes, check if record exists for that date
       const existing = getRecordByDate(value);
       if (existing) {
         setFormData(existing);
       } else {
         setFormData(prev => ({ ...prev, date: value, id: Date.now().toString() })); // Reset ID if new
       }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">📝 记一笔 (Record Data)</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
             <label className="block text-sm font-medium text-gray-700 mb-1">日期 (Date)</label>
             <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => {
                  const val = e.target.value;
                  const existing = getRecordByDate(val);
                  if (existing) {
                    setFormData(existing);
                  } else {
                    // keep other values? usually cleaner to reset if it's a new date, 
                    // but for UX let's keep it reset to avoid confusion
                    setFormData({ ...emptyRecord, date: val, id: Date.now().toString() });
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <h3 className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wider">Revenue Input</h3>
            </div>
            
            <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">总销售额 (GMV)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="gmv" value={formData.gmv || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none font-medium" placeholder="0.00" />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">仅退款 (Refund Only)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="refundsOnly" value={formData.refundsOnly || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>
             <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">退货退款 (Return & Refund)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="returns" value={formData.returns || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>

            <div className="col-span-2 mt-2">
              <h3 className="text-sm font-semibold text-emerald-600 mb-3 uppercase tracking-wider">Costs Input</h3>
            </div>

            <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">采购成本 (COGS)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="cogs" value={formData.cogs || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>
            
            <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">广告推广 (Ads)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="ads" value={formData.ads || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">物流配送 (Shipping)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="shipping" value={formData.shipping || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>

             <div className="group">
              <label className="block text-xs font-medium text-gray-500 mb-1">平台扣点 (Fees)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="platformFees" value={formData.platformFees || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>
            
             <div className="group col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">其他支出 (Others)</label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-gray-400">¥</span>
                <input type="number" step="0.01" name="otherCosts" value={formData.otherCosts || ''} onChange={handleChange} className="w-full pl-7 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none" placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              取消 (Cancel)
            </button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
              保存记录 (Save)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordModal;
