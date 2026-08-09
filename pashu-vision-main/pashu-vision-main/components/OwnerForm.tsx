import React, { useState, useEffect } from 'react';
import { OwnerData, IdType } from '../types';
import { INDIAN_STATES } from '../constants';
import { INDIAN_STATES_AND_DISTRICTS } from '../utils/locationData';
import { Icon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface OwnerFormProps {
  initialData: OwnerData;
  onSubmit: (data: OwnerData) => void;
  onSaveDraft: (data: OwnerData) => void;
  onBack: () => void;
  isSubmitting: boolean;
  isUpdateMode?: boolean;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ID_VALIDATION_RULES: { [key in IdType]: { regex: RegExp, length: number, errorMessageKey: string } } = {
    'Aadhaar': { regex: /^\d{12}$/, length: 12, errorMessageKey: 'ownerForm.errors.aadhaar' },
    'Voter ID': { regex: /^[A-Z]{3}[0-9]{7}$/, length: 10, errorMessageKey: 'ownerForm.errors.voterId' },
    'Ration Card': { regex: /^[a-zA-Z0-9]{8,16}$/, length: 16, errorMessageKey: 'ownerForm.errors.rationCard' },
    'Passport': { regex: /^[A-PR-WYa-pr-wy][1-9]\d\s?\d{4}[1-9]$/, length: 8, errorMessageKey: 'ownerForm.errors.passport' },
    '': { regex: /.*/, length: 0, errorMessageKey: '' } // for empty selection
};

export const OwnerForm: React.FC<OwnerFormProps> = ({ initialData, onSubmit, onSaveDraft, onBack, isSubmitting, isUpdateMode }) => {
  const [formData, setFormData] = useState<OwnerData>(initialData);
  const [districts, setDistricts] = useState<string[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof OwnerData, string>>>({});
  const [validFields, setValidFields] = useState<Partial<Record<keyof OwnerData, boolean>>>({});
  const { t } = useLanguage();
  
  const today = new Date().toISOString().split('T')[0];
  const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0];

  useEffect(() => setFormData(initialData), [initialData]);

  useEffect(() => {
    setDistricts(formData.state ? INDIAN_STATES_AND_DISTRICTS[formData.state] || [] : []);
  }, [formData.state]);

  const validateField = (name: keyof OwnerData, value: string, currentData: OwnerData): string | null => {
      switch (name) {
          case 'mobile': return /^\d{10}$/.test(value) ? null : t('ownerForm.errors.mobile');
          case 'pincode': return value.length > 0 && !/^\d{6}$/.test(value) ? t('ownerForm.errors.pincode') : null;
          case 'ifscCode': return value.length > 0 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value) ? t('ownerForm.errors.ifsc') : null;
          case 'idNumber':
              const rule = ID_VALIDATION_RULES[currentData.idType];
              return rule && rule.errorMessageKey && !rule.regex.test(value) ? t(rule.errorMessageKey) : null;
          default: return null;
      }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as { name: keyof OwnerData; value: string };
    
    setErrors(prev => ({ ...prev, [name]: undefined }));

    const updatedFormData = { ...formData, [name]: value };

    if (name === 'state') {
        updatedFormData.district = '';
    } else if (name === 'idType') {
        updatedFormData.idNumber = '';
        setValidFields(prev => ({ ...prev, idNumber: false }));
    }
    
    setFormData(updatedFormData);

    const validationError = validateField(name, value, updatedFormData);
    setValidFields(prev => ({ ...prev, [name]: !validationError }));
  };
  
  const validateForm = (): boolean => {
      const newErrors: Partial<Record<keyof OwnerData, string>> = {};
      const requiredFields: (keyof OwnerData)[] = ['name', 'mobile', 'dob', 'gender', 'address', 'village', 'district', 'state', 'idType', 'idNumber'];
      
      requiredFields.forEach(key => {
          if (!formData[key] || formData[key].toString().trim() === '') {
              newErrors[key] = t('ownerForm.errors.required');
          }
      });
      
      (Object.keys(formData) as Array<keyof OwnerData>).forEach(key => {
          const validationError = validateField(key, formData[key], formData);
          if (validationError) {
              newErrors[key] = validationError;
          }
      });

      if (formData.dob) {
          const selectedDate = new Date(formData.dob);
          if (selectedDate > new Date(today)) newErrors.dob = t('ownerForm.errors.dobFuture');
          if (selectedDate < new Date(minDate)) newErrors.dob = t('ownerForm.errors.dobOld');
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
        onSubmit(formData);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm space-y-6 border border-cream-200">
        <h3 className="text-xl font-bold text-primary-900">{isUpdateMode ? t('ownerForm.updateTitle') : t('ownerForm.title')}</h3>
      
      <Section title={t('ownerForm.personalTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label={t('ownerForm.name')} name="name" value={formData.name} onChange={handleChange} error={errors.name} required />
            <InputField label={t('ownerForm.mobile')} name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} error={errors.mobile} pattern="\d*" isValid={validFields.mobile} required />
            <InputField label={t('ownerForm.dob')} name="dob" type="date" value={formData.dob} onChange={handleChange} error={errors.dob} max={today} min={minDate} required />
            <SelectField label={t('ownerForm.gender')} name="gender" value={formData.gender} onChange={handleChange} error={errors.gender} required>
                <option value="" disabled>{t('ownerForm.chooseGender')}</option>
                <option value="Female">{t('sex.female')}</option>
                <option value="Male">{t('sex.male')}</option>
                <option value="Other">{t('gender.other')}</option>
                <option value="Prefer not to say">{t('gender.preferNotToSay')}</option>
            </SelectField>
            <SelectField label={t('ownerForm.caste')} name="casteCategory" value={formData.casteCategory} onChange={handleChange} error={errors.casteCategory}>
                <option value="">{t('ownerForm.selectCategory')}</option>
                <option value="General">{t('caste.general')}</option>
                <option value="OBC">{t('caste.obc')}</option>
                <option value="SC">{t('caste.sc')}</option>
                <option value="ST">{t('caste.st')}</option>
            </SelectField>
        </div>
      </Section>
      
      <Section title={t('ownerForm.idTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField label={t('ownerForm.idType')} name="idType" value={formData.idType} onChange={handleChange} error={errors.idType} required>
                <option value="Aadhaar">{t('id.aadhaar')}</option>
                <option value="Voter ID">{t('id.voter')}</option>
                <option value="Ration Card">{t('id.ration')}</option>
                <option value="Passport">{t('id.passport')}</option>
            </SelectField>
            <InputField label={t('ownerForm.idNumber', { idType: t(`id.${formData.idType?.toLowerCase() || 'id'}`) })} name="idNumber" value={formData.idNumber} onChange={handleChange} error={errors.idNumber} maxLength={ID_VALIDATION_RULES[formData.idType]?.length || 50} isValid={validFields.idNumber} required />
        </div>
      </Section>

      <Section title={t('ownerForm.locationTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField label={t('ownerForm.state')} name="state" value={formData.state} onChange={handleChange} error={errors.state} required>
                <option value="" disabled>{t('ownerForm.selectState')}</option>
                {INDIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
            </SelectField>
            <SelectField label={t('ownerForm.district')} name="district" value={formData.district} onChange={handleChange} error={errors.district} disabled={!formData.state || districts.length === 0} required>
                <option value="" disabled>{t('ownerForm.selectDistrict')}</option>
                {districts.map(district => <option key={district} value={district}>{district}</option>)}
            </SelectField>
            <InputField label={t('ownerForm.address')} name="address" value={formData.address} onChange={handleChange} error={errors.address} required />
            <InputField label={t('ownerForm.village')} name="village" value={formData.village} onChange={handleChange} error={errors.village} required />
            <InputField label={t('ownerForm.pincode')} name="pincode" type="tel" value={formData.pincode} onChange={handleChange} maxLength={6} error={errors.pincode} pattern="\d*" isValid={validFields.pincode} />
        </div>
      </Section>
      
      <Section title={t('ownerForm.bankTitle')}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label={t('ownerForm.account')} name="bankAccount" value={formData.bankAccount} onChange={handleChange} error={errors.bankAccount} pattern="\d*" />
              <InputField label={t('ownerForm.ifsc')} name="ifscCode" value={formData.ifscCode} onChange={handleChange} maxLength={11} error={errors.ifscCode} isValid={validFields.ifscCode} />
          </div>
      </Section>


      <div className="flex flex-col sm:flex-row gap-2 justify-between mt-8 pt-6 border-t border-cream-200">
        <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-transform duration-150 active:scale-95" disabled={isSubmitting}>{t('buttons.back')}</button>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" onClick={() => onSaveDraft(formData)} className="px-6 py-2 border border-accent-yellow-500 rounded-md text-accent-yellow-700 font-semibold hover:bg-accent-yellow-50 transition-colors">
                {t('buttons.saveDraft')}
            </button>
            <button 
                type="submit" 
                className="px-8 py-2 bg-accent-500 text-white font-semibold rounded-md hover:bg-accent-600 shadow-sm flex items-center justify-center sm:w-56 disabled:bg-accent-400 disabled:cursor-not-allowed transition-transform duration-150 active:scale-95"
                disabled={isSubmitting}
            >
              {isSubmitting ? <><Spinner />{t('buttons.processing')}</> : (isUpdateMode ? t('buttons.saveChanges') : t('buttons.submitForAnalysis'))}
            </button>
        </div>
      </div>
    </form>
    </>
  );
};

const Section: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h4 className="text-md font-bold text-primary-900 border-b pb-2 mb-4">{title}</h4>
        {children}
    </div>
);

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: keyof OwnerData;
  error?: string | null;
  isValid?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, error, isValid, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-primary-800">{label}{props.required && ' *'}</label>
    <div className="relative mt-1">
        <input
          id={name}
          name={name}
          {...props}
          className={`block w-full p-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900`}
        />
        {isValid && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Icon name="check" className="h-5 w-5 text-green-500" />
            </div>
        )}
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: keyof OwnerData;
  error?: string | null;
  children: React.ReactNode;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, name, error, children, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-primary-800">{label}{props.required && ' *'}</label>
        <select
            id={name}
            name={name}
            {...props}
            className={`mt-1 block w-full p-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900 disabled:bg-gray-100`}
        >
            {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);