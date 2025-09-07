import React from 'react';
import { Modal, Card, Badge, Button } from './index';

const AdminSettingsModal = ({ 
  isOpen,
  onClose,
  sections,
  sectionVisibility,
  pageVisibility,
  onSectionVisibilityChange,
  onPageVisibilityChange,
  onSave,
  onReset,
  className = '',
  ...props 
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Settings"
      size="xl"
      className={className}
      {...props}
    >
      <div className="space-y-6">
        <Card variant="flat" className="bg-blue-900/20 border-blue-700/50">
          <div className="flex items-start space-x-3">
            <div className="text-blue-400 text-lg">ℹ️</div>
            <div>
              <h4 className="font-semibold text-blue-200 mb-1">Important Note</h4>
              <p className="text-blue-300 text-sm">
                These settings only affect what <strong>Managers</strong> and <strong>Members</strong> can see. 
                <strong>Admins always have full access to all pages and features.</strong>
              </p>
            </div>
          </div>
        </Card>
        
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Page Visibility Control</h3>
          <p className="text-sm text-slate-400 mb-4">
            Control which pages are visible to managers and members. <strong>Admins always have full access to all pages.</strong>
          </p>
          
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <Card key={sectionIndex} variant="flat" className="border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-200">{section.label}</h4>
                    <span className="text-xs text-slate-400">Manager Access</span>
                  </div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={sectionVisibility[sectionIndex] || false}
                      onChange={(e) => onSectionVisibilityChange(sectionIndex, e.target.checked)}
                      className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800"
                    />
                    <span className="ml-2 text-sm text-slate-300">Visible</span>
                  </label>
                </div>
                
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between py-2 px-3 bg-slate-700/50 rounded-lg">
                      <span className="text-sm text-slate-300">{item.title}</span>
                      <label className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={pageVisibility[`${sectionIndex}-${itemIndex}`] || false}
                          onChange={(e) => onPageVisibilityChange(sectionIndex, itemIndex, e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800"
                        />
                        <span className="ml-2 text-xs text-slate-400">Visible</span>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-3">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="flat" className="border-blue-200 bg-blue-50">
              <div className="text-center">
                <h4 className="font-semibold text-blue-900">Admin</h4>
                <p className="text-xs text-blue-700 mb-2">Full access to all features and settings</p>
                <Badge variant="primary">Full Access</Badge>
              </div>
            </Card>
            <Card variant="flat" className="border-yellow-200 bg-yellow-50">
              <div className="text-center">
                <h4 className="font-semibold text-yellow-900">Manager</h4>
                <p className="text-xs text-yellow-700 mb-2">Access controlled by admin settings above</p>
                <Badge variant="warning">Controlled</Badge>
              </div>
            </Card>
            <Card variant="flat" className="border-gray-200 bg-gray-50">
              <div className="text-center">
                <h4 className="font-semibold text-gray-900">Member</h4>
                <p className="text-xs text-gray-700 mb-2">Limited access based on admin configuration</p>
                <Badge variant="default">Limited</Badge>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <Button 
            variant="secondary"
            onClick={onReset}
          >
            Reset to Defaults
          </Button>
          
          <div className="flex space-x-3">
            <Button 
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={onSave}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AdminSettingsModal;
