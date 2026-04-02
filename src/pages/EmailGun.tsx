import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Mail, Download, Check, X, Filter, User, ArrowRight, ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { RichTextEditor, RichTextEditorRef } from '../components/ui/RichTextEditor';

interface Contact {
  id: number;
  client_organization: string;
  client_contact: string; // Full Name
  email: string;
  position: string;
}

export function EmailGun() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("All");
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);
  
  // Email Content State
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(""); // HTML content
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    fetch('/api/contacts')
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(err => console.error("Failed to fetch contacts", err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.senderEmail) {
          setSenderEmail(data.senderEmail);
        }
      })
      .catch(err => console.error("Failed to fetch settings", err));
  }, []);

  // Derived State
  const organizations = useMemo(() => {
    const orgs = new Set(contacts.map(c => c.client_organization).filter(Boolean));
    return ["All", ...Array.from(orgs).sort()];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (!c.email || c.email.trim() === '') return false; // Filter out contacts with no email

      const cleanPhone = ((c as any).phone || "").replace(/\D/g, "");
      const cleanSearch = searchQuery.replace(/\D/g, "");
      const phoneMatch = ((c as any).phone || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (cleanSearch.length > 0 && cleanPhone.includes(cleanSearch));

      const matchesSearch = (c.client_contact || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (c.client_organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                            phoneMatch;
      const matchesOrg = orgFilter === "All" || c.client_organization === orgFilter;
      return matchesSearch && matchesOrg;
    });
  }, [contacts, searchQuery, orgFilter]);

  const groupedFilteredContacts = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    filteredContacts.forEach(c => {
      const org = c.client_organization || 'Unassigned';
      if (!groups[org]) groups[org] = [];
      groups[org].push(c);
    });
    return groups;
  }, [filteredContacts]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setExpandedOrgs(Object.keys(groupedFilteredContacts));
    }
  }, [searchQuery, groupedFilteredContacts]);

  const toggleOrg = (org: string) => {
    setExpandedOrgs(prev => 
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  };

  // Helper to get short name (First Name)
  const getShortName = (fullName: string) => {
    return (fullName || "").split(' ')[0] || fullName;
  };

  // Helper to replace variables
  const processTemplate = (template: string, contact: Contact) => {
    let content = template;
    content = content.replace(/{FirstName}/g, getShortName(contact.client_contact));
    content = content.replace(/{FullName}/g, contact.client_contact);
    content = content.replace(/{Organization}/g, contact.client_organization);
    content = content.replace(/{Position}/g, contact.position || "");
    return content;
  };

  // Selection Handlers
  const toggleContact = (id: number) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContactIds(newSet);
  };

  const toggleAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  // Helper to generate EML content
  const createEmlContent = (contact: Contact) => {
    const processedSubject = processTemplate(subject, contact);
    const processedBody = processTemplate(body, contact);
    
    const fromHeader = senderEmail ? `From: ${senderEmail}\n` : '';

    return `${fromHeader}To: "${contact.client_contact}" <${contact.email}>
Subject: ${processedSubject}
X-Unsent: 1
Content-Type: text/html; charset="utf-8"

<html>
<body>
${processedBody}
</body>
</html>`;
  };

  // Action: Download all drafts as ZIP
  const handleDownloadDrafts = async () => {
    if (selectedContactIds.size === 0) return;
    
    const zip = new JSZip();
    const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id));
    
    selectedContacts.forEach(contact => {
      if (!contact.email) return;
      const emlContent = createEmlContent(contact);
      const filename = `${contact.client_contact.replace(/[^a-z0-9]/gi, '_')}_draft.eml`;
      zip.file(filename, emlContent);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "email_drafts.zip");
  };

  // Action: Download single draft (preserves formatting)
  const handleDownloadSingleDraft = (contact: Contact) => {
    if (!contact.email) return;
    const emlContent = createEmlContent(contact);
    const blob = new Blob([emlContent], { type: "message/rfc822;charset=utf-8" });
    saveAs(blob, `${contact.client_contact.replace(/[^a-z0-9]/gi, '_')}_draft.eml`);
  };

  // Action: Open Mail Client (mailto) for ALL selected
  const handleBatchOpenMail = async () => {
    const selectedContacts = contacts.filter(c => selectedContactIds.has(c.id));
    
    if (selectedContacts.length === 0) return;

    if (selectedContacts.length > 1) {
      alert("Opening multiple email windows... \n\n⚠️ IMPORTANT: If only one window opens, please check your browser's address bar for a 'Popup Blocked' icon and allow popups for this site.");
    }

    for (const contact of selectedContacts) {
      if (!contact.email) continue;
      
      const processedSubject = processTemplate(subject, contact);
      
      // Convert HTML to plain text while preserving line breaks
      const htmlContent = processTemplate(body, contact);
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent
        .replace(/<br\s*\/?>/gi, '\n') // Replace <br> with newline
        .replace(/<\/p>/gi, '\n\n')    // Replace </p> with double newline
        .replace(/<\/div>/gi, '\n')    // Replace </div> with newline
        .replace(/<li>/gi, '• ')       // Replace <li> with bullet
        .replace(/<\/li>/gi, '\n');    // Replace </li> with newline
      
      const plainTextBody = tempDiv.textContent || tempDiv.innerText || "";

      const mailtoLink = `mailto:${contact.email}?subject=${encodeURIComponent(processedSubject)}&body=${encodeURIComponent(plainTextBody)}`;
      
      // Open window
      window.open(mailtoLink, '_blank');
      
      // Small delay to prevent browser from blocking subsequent popups too aggressively
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-6">
      {/* Left Panel: Recipient Selection */}
      <div className="w-full lg:w-1/3 h-[500px] lg:h-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-lg flex flex-col">
        <div className="p-4 border-b border-[var(--border)] space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-light text-[var(--text-primary)] flex items-center gap-2">
              <User size={18} /> RECIPIENTS
            </h2>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {selectedContactIds.size} Selected
            </span>
          </div>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] pl-9 pr-3 py-2 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2 max-w-full">
            <select 
              className="flex-1 min-w-0 bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1.5 text-xs rounded text-[var(--text-primary)] focus:outline-none"
              value={orgFilter}
              onChange={e => setOrgFilter(e.target.value)}
            >
              {organizations.map(org => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <button 
              onClick={toggleAll}
              className="px-3 py-1.5 whitespace-nowrap bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs rounded hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] shrink-0"
            >
              {selectedContactIds.size === filteredContacts.length ? "Deselect All" : "Select All"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.entries(groupedFilteredContacts).map(([org, orgContacts]: [string, Contact[]]) => (
            <div key={org} className="border border-[var(--border)] rounded overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                onClick={() => toggleOrg(org)}
              >
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--text-secondary)]" />
                  <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wide">{org}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">{orgContacts.length}</span>
                  {expandedOrgs.includes(org) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </div>
              
              {expandedOrgs.includes(org) && (
                <div className="divide-y divide-[var(--border)]">
                  {orgContacts.map(contact => (
                    <div 
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                        selectedContactIds.has(contact.id) 
                          ? "bg-[var(--bg-tertiary)]" 
                          : "bg-transparent hover:bg-[var(--bg-tertiary)]"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                        selectedContactIds.has(contact.id) ? "bg-[var(--text-primary)] border-[var(--text-primary)]" : "border-[var(--text-secondary)]"
                      )}>
                        {selectedContactIds.has(contact.id) && <Check size={10} className="text-[var(--bg-primary)]" />}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <h4 className="text-sm font-medium text-[var(--text-primary)] truncate">{contact.client_contact}</h4>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{contact.position || "No position specified"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredContacts.length === 0 && (
            <div className="p-4 text-center text-xs text-[var(--text-secondary)] italic">No contacts found with email addresses.</div>
          )}
        </div>
      </div>

      {/* Right Panel: Composer */}
      <div className="w-full lg:flex-1 h-[600px] lg:h-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-lg flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <h2 className="font-light text-[var(--text-primary)] flex items-center gap-2">
            <Mail size={18} /> EMAIL GUN
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={cn(
                "flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors border text-center",
                isPreviewMode 
                  ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]" 
                  : "bg-transparent text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-primary)]"
              )}
            >
              {isPreviewMode ? "Edit Mode" : "Preview Mode"}
            </button>
            <button 
              onClick={handleDownloadDrafts}
              disabled={selectedContactIds.size === 0}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider rounded hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download size={14} /> <span className="hidden sm:inline">Download Drafts</span><span className="sm:hidden">Drafts</span>
            </button>
          </div>
        </div>

        {isPreviewMode ? (
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-secondary)]">
            {selectedContactIds.size > 0 ? (
              <div className="space-y-8 max-w-3xl mx-auto">
                {contacts.filter(c => selectedContactIds.has(c.id)).slice(0, 5).map(contact => (
                  <div key={contact.id} className="bg-white text-black p-4 sm:p-6 rounded shadow-lg border border-gray-200">
                    <div className="border-b border-gray-200 pb-4 mb-4 space-y-2">
                      <div className="flex gap-2 text-sm">
                        <span className="font-bold text-gray-500 w-16 shrink-0">To:</span>
                        <span className="break-all">{contact.client_contact} &lt;{contact.email}&gt;</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="font-bold text-gray-500 w-16 shrink-0">Subject:</span>
                        <span className="break-words">{processTemplate(subject, contact)}</span>
                      </div>
                    </div>
                    <div 
                      className="prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: processTemplate(body, contact) }} 
                    />
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                      <button 
                        onClick={() => handleDownloadSingleDraft(contact)}
                        className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 px-2 py-1 border border-transparent hover:border-gray-200 rounded"
                        title="Download as .eml file (Preserves formatting)"
                      >
                        <Download size={12} /> .eml
                      </button>
                      <button 
                        onClick={handleBatchOpenMail}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span className="hidden sm:inline">Open All ({selectedContactIds.size}) in Mail App</span>
                        <span className="sm:hidden">Open All ({selectedContactIds.size})</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {selectedContactIds.size > 5 && (
                  <div className="text-center text-[var(--text-secondary)] italic">
                    ...and {selectedContactIds.size - 5} more recipients
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                Select recipients to see preview
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-mono uppercase text-[var(--text-secondary)] mb-1">Subject</label>
              <input 
                type="text" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-3 text-sm rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
                placeholder="Email Subject..."
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1 gap-2 sm:gap-0">
                <label className="block text-xs font-mono uppercase text-[var(--text-secondary)]">Body</label>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => editorRef.current?.insertText("{FirstName}")} className="text-[10px] px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {'{FirstName}'}
                  </button>
                  <button onClick={() => editorRef.current?.insertText("{FullName}")} className="text-[10px] px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {'{FullName}'}
                  </button>
                  <button onClick={() => editorRef.current?.insertText("{Organization}")} className="text-[10px] px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded hover:border-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {'{Organization}'}
                  </button>
                </div>
              </div>
              <RichTextEditor 
                ref={editorRef}
                value={body} 
                onChange={setBody} 
                className="flex-1 min-h-[300px]"
                placeholder="Write your email content here..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
