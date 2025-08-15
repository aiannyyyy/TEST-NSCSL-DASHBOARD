// modalManager.js - Enhanced Modal Management System
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.currentModal = null;
        this.isInitialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Modal Manager...');
        
        // Initialize all modals
        const modalIds = ['addEventModal', 'resultsModal', 'detailsModal', 'addNotebookModal'];
        
        modalIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Destroy any existing instance first
                const existingInstance = bootstrap.Modal.getInstance(element);
                if (existingInstance) {
                    existingInstance.dispose();
                }
                
                // Create new instance
                const modal = new bootstrap.Modal(element, {
                    backdrop: 'static',
                    keyboard: true
                });
                
                this.modals.set(id, modal);
                
                // Add event listeners
                element.addEventListener('shown.bs.modal', () => {
                    this.currentModal = id;
                    console.log(`✅ Modal opened: ${id}`);
                });
                
                element.addEventListener('hidden.bs.modal', () => {
                    if (this.currentModal === id) {
                        this.currentModal = null;
                    }
                    // Clean up any lingering backdrops
                    this.cleanupBackdrops();
                    console.log(`❌ Modal closed: ${id}`);
                });
                
                console.log(`📝 Initialized modal: ${id}`);
            } else {
                console.warn(`⚠️ Modal element not found: ${id}`);
            }
        });
        
        this.setupGlobalEventHandlers();
        this.isInitialized = true;
        console.log('✅ Modal Manager initialized successfully');
    }

    setupGlobalEventHandlers() {
        // Handle escape key for closing modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hide(this.currentModal);
            }
        });

        // Add close button handlers for all modals
        document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hide(modal.id);
                }
            });
        });
    }

    show(modalId, hideCurrentFirst = true) {
        console.log(`🔄 Request to show modal: ${modalId}`);
        
        if (!this.isInitialized) {
            console.warn('⚠️ Modal Manager not initialized yet, retrying...');
            setTimeout(() => this.show(modalId, hideCurrentFirst), 100);
            return;
        }

        if (hideCurrentFirst && this.currentModal && this.currentModal !== modalId) {
            console.log(`🔄 Hiding current modal: ${this.currentModal}`);
            this.hide(this.currentModal);
        }
        
        const modal = this.modals.get(modalId);
        if (modal) {
            // Small delay to ensure previous modal is fully hidden
            const delay = hideCurrentFirst && this.currentModal ? 300 : 0;
            setTimeout(() => {
                console.log(`🎯 Showing modal: ${modalId}`);
                modal.show();
            }, delay);
        } else {
            console.error(`❌ Modal not found: ${modalId}`);
        }
    }

    hide(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            console.log(`🔄 Hiding modal: ${modalId}`);
            modal.hide();
        } else {
            console.error(`❌ Modal not found for hiding: ${modalId}`);
        }
    }

    hideAll() {
        console.log('🔄 Hiding all modals...');
        this.modals.forEach((modal, id) => {
            modal.hide();
        });
        this.cleanupBackdrops();
    }

    cleanupBackdrops() {
        // Remove any lingering modal backdrops
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 0) {
                console.log(`🧹 Cleaning up ${backdrops.length} backdrop(s)`);
                backdrops.forEach(backdrop => backdrop.remove());
            }
            
            // Reset body classes and styles
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
        }, 100);
    }

    getCurrentModal() {
        return this.currentModal;
    }

    // Get modal instance for direct access if needed
    getModal(modalId) {
        return this.modals.get(modalId);
    }

    // Emergency cleanup function
    emergencyCleanup() {
        console.log('🚨 Running emergency modal cleanup...');
        
        // Hide all Bootstrap modals
        document.querySelectorAll('.modal').forEach(modal => {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) {
                try {
                    instance.hide();
                } catch (e) {
                    console.warn('Error hiding modal:', e);
                }
            }
        });
        
        // Force remove all backdrops
        setTimeout(() => {
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                backdrop.remove();
            });
            
            // Reset body completely
            document.body.classList.remove('modal-open');
            document.body.style.paddingRight = '';
            document.body.style.overflow = '';
            document.body.removeAttribute('style');
            
            // Reinitialize
            this.isInitialized = false;
            this.currentModal = null;
            this.modals.clear();
            this.initialize();
            
            console.log('✅ Emergency cleanup completed and modal manager reinitialized');
        }, 200);
    }
}

// Create and expose global modal manager instance
window.modalManager = new ModalManager();

// Global utility functions for easy access
window.showModal = function(modalId) {
    window.modalManager.show(modalId);
};

window.hideModal = function(modalId) {
    window.modalManager.hide(modalId);
};

window.closeAllModals = function() {
    window.modalManager.hideAll();
};

window.emergencyModalCleanup = function() {
    window.modalManager.emergencyCleanup();
};

// Debug function to check modal manager status
window.checkModalStatus = function() {
    console.log('📊 Modal Manager Status:');
    console.log('- Initialized:', window.modalManager.isInitialized);
    console.log('- Current Modal:', window.modalManager.getCurrentModal());
    console.log('- Available Modals:', Array.from(window.modalManager.modals.keys()));
    console.log('- Backdrops present:', document.querySelectorAll('.modal-backdrop').length);
};

console.log('📦 Modal Manager loaded successfully');