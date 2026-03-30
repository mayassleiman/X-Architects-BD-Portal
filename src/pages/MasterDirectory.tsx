import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Phone, Mail, MapPin, 
  Briefcase, Calendar, MessageSquare, Bell, ChevronDown, ChevronRight, User,
  History, X, Download, Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSearch } from '../context/SearchContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Contact {
  id: number;
  client_organization: string;
  location: string;
  client_contact: string;
  position: string;
  phone: string;
  email: string;
  category?: string;
}

interface Engagement {
  id: number;
  contact_id: number;
  date: string;
  discussion: string;
  // Joined fields for recent view
  client_contact?: string;
  client_organization?: string;
}

interface FollowUp {
  id: number;
  contact_id: number;
  date: string;
  description: string;
  status: 'Pending' | 'Done';
}

export function MasterDirectory() {
  const { searchQuery } = useSearch();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const [viewMode, setViewMode] = useState<'details' | 'map'>('details');
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [activeContactIds, setActiveContactIds] = useState<Set<number>>(new Set());

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);
  
  // Data for selected contact
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [recentEngagements, setRecentEngagements] = useState<Engagement[]>([]);

  // Engagement Filters
  const [engagementSearch, setEngagementSearch] = useState("");
  const [engagementStartDate, setEngagementStartDate] = useState("");
  const [engagementEndDate, setEngagementEndDate] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalStartDate, setGlobalStartDate] = useState("");
  const [globalEndDate, setGlobalEndDate] = useState("");

  const filteredEngagements = useMemo(() => {
    return engagements.filter(eng => {
      const matchesSearch = (eng.discussion || "").toLowerCase().includes(engagementSearch.toLowerCase());
      const matchesStart = engagementStartDate ? eng.date >= engagementStartDate : true;
      const matchesEnd = engagementEndDate ? eng.date <= engagementEndDate : true;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [engagements, engagementSearch, engagementStartDate, engagementEndDate]);

  // Form states
  const [contactForm, setContactForm] = useState<Partial<Contact>>({});
  const [engagementForm, setEngagementForm] = useState<{id?: number, date: string, discussion: string}>({ date: new Date().toISOString().split('T')[0], discussion: '' });
  const [followUpForm, setFollowUpForm] = useState<{id?: number, date: string, description: string, status?: 'Pending' | 'Done'}>({ date: '', description: '' });

  const [companyTypes, setCompanyTypes] = useState<{id: number, name: string, color: string}[]>([]);

  useEffect(() => {
    fetchContacts();
    fetchCompanyTypes();
  }, []);

  const fetchCompanyTypes = async () => {
    try {
      const res = await fetch('/api/company-types');
      const data = await res.json();
      setCompanyTypes(data);
    } catch (error) {
      console.error("Failed to fetch company types", error);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      fetchEngagements(selectedContact.id);
      fetchFollowUps(selectedContact.id);
      setEngagementSearch("");
      setEngagementStartDate("");
      setEngagementEndDate("");
    }
  }, [selectedContact]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    }
  };

  const fetchEngagements = async (contactId: number) => {
    const res = await fetch(`/api/contacts/${contactId}/engagements`);
    setEngagements(await res.json());
  };

  const fetchFollowUps = async (contactId: number) => {
    const res = await fetch(`/api/contacts/${contactId}/follow-ups`);
    setFollowUps(await res.json());
  };

  const fetchGlobalEngagements = async (query = "", start = "", end = "") => {
    let url = '/api/engagements/search?';
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (start) params.append('startDate', start);
    if (end) params.append('endDate', end);
    
    const res = await fetch(url + params.toString());
    setRecentEngagements(await res.json());
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'transparent';
    const type = companyTypes.find(t => t.name === category);
    return type ? type.color : 'transparent';
  };

  // Group contacts by organization
  const groupedContacts = useMemo(() => {
    const filtered = contacts.filter(c => 
      (c.client_contact || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.client_organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, Contact[]> = {};
    filtered.forEach(c => {
      const org = c.client_organization || 'Unassigned';
      if (!groups[org]) groups[org] = [];
      groups[org].push(c);
    });
    return groups;
  }, [contacts, searchQuery]);

  const contactsByLocation: Record<string, Contact[]> = useMemo(() => {
    if (!selectedOrg || !groupedContacts[selectedOrg]) return {};
    const groups: Record<string, Contact[]> = {};
    groupedContacts[selectedOrg].forEach(c => {
      const loc = c.location || 'Other Locations';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(c);
    });
    // Sort locations alphabetically, putting 'Other Locations' last
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === 'Other Locations') return 1;
      if (b === 'Other Locations') return -1;
      return a.localeCompare(b);
    });
    
    const sortedGroups: Record<string, Contact[]> = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [selectedOrg, groupedContacts]);

  const toggleOrg = (org: string) => {
    setExpandedOrgs(prev => 
      prev.includes(org) ? prev.filter(o => o !== org) : [...prev, org]
    );
  };

  const toggleAllOrgs = () => {
    if (expandedOrgs.length === Object.keys(groupedContacts).length) {
      setExpandedOrgs([]);
    } else {
      setExpandedOrgs(Object.keys(groupedContacts));
    }
  };

  const handleMapOrg = async (org: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrg(org);
    setViewMode('map');
    setSelectedContact(null); // Clear selected contact
    
    // Fetch active engagements for this org (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];
    
    try {
      const res = await fetch(`/api/engagements/search?organization=${encodeURIComponent(org)}&startDate=${startDate}`);
      const data = await res.json();
      // Extract unique contact IDs that have engagements
      const activeIds = new Set<number>(data.map((e: any) => e.contact_id));
      setActiveContactIds(activeIds);
    } catch (error) {
      console.error("Failed to fetch org engagements", error);
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = contactForm.id ? `/api/contacts/${contactForm.id}` : '/api/contacts';
    const method = contactForm.id ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactForm)
    });
    
    setIsContactModalOpen(false);
    setContactForm({});
    fetchContacts();
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm("Delete this contact?")) return;
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    if (selectedContact?.id === id) setSelectedContact(null);
    fetchContacts();
  };

  const handleSaveEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    
    if (engagementForm.id) {
      await fetch(`/api/engagements/${engagementForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engagementForm)
      });
    } else {
      await fetch(`/api/contacts/${selectedContact.id}/engagements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engagementForm)
      });
    }
    
    setIsEngagementModalOpen(false);
    setEngagementForm({ date: new Date().toISOString().split('T')[0], discussion: '' });
    fetchEngagements(selectedContact.id);
  };

  const handleDeleteEngagement = async (id: number) => {
    if (!confirm("Delete this engagement?")) return;
    await fetch(`/api/engagements/${id}`, { method: 'DELETE' });
    if (selectedContact) fetchEngagements(selectedContact.id);
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    
    if (followUpForm.id) {
      await fetch(`/api/follow-ups/${followUpForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpForm)
      });
    } else {
      await fetch(`/api/contacts/${selectedContact.id}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...followUpForm, status: 'Pending' })
      });
    }
    
    setIsFollowUpModalOpen(false);
    setFollowUpForm({ date: '', description: '' });
    fetchFollowUps(selectedContact.id);
  };

  const handleDeleteFollowUp = async (id: number) => {
    if (!confirm("Delete this follow-up?")) return;
    await fetch(`/api/follow-ups/${id}`, { method: 'DELETE' });
    if (selectedContact) fetchFollowUps(selectedContact.id);
  };

  const toggleFollowUpStatus = async (followUp: FollowUp) => {
    const newStatus = followUp.status === 'Pending' ? 'Done' : 'Pending';
    await fetch(`/api/follow-ups/${followUp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (selectedContact) fetchFollowUps(selectedContact.id);
  };



  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    // Add Logo
    let tableStartY = 45;
    try {
      const response = await fetch('/api/logo');
      if (response.ok) {
        const blob = await response.blob();
        const logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const imgProps = doc.getImageProperties(logoBase64);
        const pdfWidth = doc.internal.pageSize.getWidth();
        
        // Constrain logo dimensions
        let logoWidth = 40; 
        let logoHeight = (imgProps.height * logoWidth) / imgProps.width;
        
        // If logo is too tall, constrain by height instead
        if (logoHeight > 30) {
          logoHeight = 30;
          logoWidth = (imgProps.width * logoHeight) / imgProps.height;
        }

        doc.addImage(logoBase64, 'PNG', pdfWidth - logoWidth - 14, 10, logoWidth, logoHeight);
        
        // Ensure table starts below logo with some padding
        tableStartY = Math.max(tableStartY, 10 + logoHeight + 10);
      }
    } catch (error) {
      console.error("Error adding logo to PDF", error);
    }
    
    const pdfWidth = doc.internal.pageSize.getWidth();
    const contentMaxWidth = pdfWidth - 28 - 50; // Subtract margins and logo space

    // Title
    doc.setFontSize(18);
    doc.text("Engagement Report", 14, 22);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString();
    doc.text(`Generated on: ${dateStr}`, 14, 28);
    
    // Filters info
    if (globalSearch || globalStartDate || globalEndDate) {
      let filterText = "Filters: ";
      if (globalSearch) filterText += `Search: "${globalSearch}" `;
      if (globalStartDate) filterText += `From: ${globalStartDate} `;
      if (globalEndDate) filterText += `To: ${globalEndDate}`;
      
      // Split text to fit if needed
      const splitText = doc.splitTextToSize(filterText, contentMaxWidth);
      doc.text(splitText, 14, 34);
      
      // Adjust table start if filters take multiple lines
      if (splitText.length > 1) {
        tableStartY = Math.max(tableStartY, 34 + (splitText.length * 5) + 5);
      }
    }

    // Table Data
    const tableBody = recentEngagements.map(eng => [
      eng.date,
      eng.client_contact || "N/A",
      eng.client_organization || "N/A",
      eng.discussion
    ]);

    // Generate Table
    autoTable(doc, {
      head: [['Date', 'Contact', 'Organization', 'Discussion']],
      body: tableBody,
      startY: tableStartY,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 35 }, // Contact
        2: { cellWidth: 40 }, // Organization
        3: { cellWidth: 'auto' } // Discussion
      }
    });

    doc.save("engagement_report.pdf");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* List Panel */}
      <div className="w-1/3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg flex flex-col">
        {/* ... header ... */}
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="font-light text-[var(--text-primary)]">DIRECTORY</h2>
          <div className="flex gap-2">
            {/* ... existing buttons ... */}
            <button 
              onClick={() => { 
                window.history.pushState({}, "", "/email-gun");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Email Gun"
            >
              <Mail size={18} />
            </button>
            <button 
              onClick={() => { 
                setGlobalSearch(""); 
                setGlobalStartDate(""); 
                setGlobalEndDate(""); 
                fetchGlobalEngagements(); 
                setIsRecentModalOpen(true); 
              }}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Global Engagement Search"
            >
              <History size={18} />
            </button>
            <button 
              onClick={toggleAllOrgs}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title={expandedOrgs.length === Object.keys(groupedContacts).length ? "Collapse All" : "Expand All"}
            >
              {expandedOrgs.length === Object.keys(groupedContacts).length ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            <button 
              onClick={() => { setContactForm({}); setIsContactModalOpen(true); }}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-primary)]"
              title="Add Contact"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {Object.entries(groupedContacts).map(([org, orgContacts]: [string, Contact[]]) => {
            const category = orgContacts[0]?.category; 
            return (
              <div 
                key={org} 
                className="border border-[var(--border)] rounded overflow-hidden"
                style={{ borderLeft: `4px solid ${getCategoryColor(category)}` }}
              >
                <div className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors group/org">
                  <button 
                    onClick={() => toggleOrg(org)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Building2 size={16} className="text-[var(--text-secondary)]" />
                    <span className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wide">{org}</span>
                    {category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)]">{category}</span>}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleMapOrg(org, e)}
                      className="p-1.5 hover:bg-[var(--bg-primary)] rounded text-[var(--text-secondary)] hover:text-emerald-400 opacity-0 group-hover/org:opacity-100 transition-all"
                      title="Map Organization"
                    >
                      <MapPin size={14} />
                    </button>
                    <span className="text-xs text-[var(--text-secondary)]">{orgContacts.length}</span>
                    <button onClick={() => toggleOrg(org)}>
                      {expandedOrgs.includes(org) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>
                </div>
                
                {expandedOrgs.includes(org) && (
                  <div className="divide-y divide-[var(--border)]">
                    {orgContacts.map(contact => (
                      <div 
                        key={contact.id}
                        onClick={() => { setSelectedContact(contact); setViewMode('details'); }}
                        className={cn(
                          "p-3 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors flex items-center justify-between group",
                          selectedContact?.id === contact.id && viewMode === 'details' ? "bg-[var(--bg-tertiary)] border-l-2 border-[var(--text-primary)]" : "pl-3"
                        )}
                      >
                        {/* ... contact item content ... */}
                        <div>
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-[var(--text-tertiary)]" />
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">{contact.client_contact}</h4>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] pl-5.5">{contact.position}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setContactForm(contact); setIsContactModalOpen(true); }}
                            className="p-1 hover:text-[var(--text-primary)] text-[var(--text-secondary)]"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg flex flex-col relative overflow-hidden">
        {viewMode === 'map' && selectedOrg ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
              <div>
                <h1 className="text-2xl font-light text-[var(--text-primary)] mb-1 flex items-center gap-3">
                  <Building2 size={24} />
                  {selectedOrg}
                </h1>
                <p className="text-[var(--text-secondary)] text-sm uppercase tracking-wider">Organization Map</p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Engagement (Last 90 Days)
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-8 bg-[var(--bg-primary)]">
              <div className="flex flex-col items-center gap-10 min-w-fit w-full">
                {/* Root Node */}
                <div className="flex flex-col items-center">
                  <div className="w-72 p-6 bg-[var(--card-bg)] border-2 border-[var(--text-primary)] rounded-xl shadow-lg flex flex-col items-center text-center z-10 relative">
                    <Building2 size={40} className="mb-3 text-[var(--text-primary)]" />
                    <h2 className="font-bold text-xl text-[var(--text-primary)]">{selectedOrg}</h2>
                    <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mt-1">Organization Overview</span>
                  </div>
                </div>

                {/* Locations Groups */}
                <div className="w-full max-w-6xl space-y-8">
                  {Object.entries(contactsByLocation).map(([location, locContacts]) => (
                    <div key={location} className="bg-[var(--bg-tertiary)]/20 rounded-2xl p-6 border border-[var(--border)]">
                      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[var(--border)]">
                        <div className="p-2 bg-[var(--bg-tertiary)] rounded-full text-[var(--text-secondary)]">
                          <MapPin size={18} />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)] uppercase tracking-wide">{location}</h3>
                        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">{locContacts.length}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {locContacts.map(contact => {
                          const isActive = activeContactIds.has(contact.id);
                          return (
                            <div 
                              key={contact.id}
                              onClick={() => { setSelectedContact(contact); setViewMode('details'); }}
                              className={cn(
                                "relative group cursor-pointer transition-all duration-300 hover:-translate-y-1",
                                "bg-[var(--card-bg)] border rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md",
                                isActive 
                                  ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                                  : "border-[var(--border)] hover:border-[var(--text-secondary)]"
                              )}
                            >
                              {isActive && (
                                <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[var(--bg-primary)] shadow-sm z-20" />
                              )}
                              
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                                    isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                                  )}>
                                    {contact.client_contact.charAt(0)}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-[var(--text-primary)] leading-tight">{contact.client_contact}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{contact.position || "No Position"}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/50">
                                {contact.email && (
                                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] truncate">
                                    <Mail size={12} />
                                    <span className="truncate">{contact.email}</span>
                                  </div>
                                )}
                                {contact.phone && (
                                  <a 
                                    href={`tel:${contact.phone}`}
                                    className="flex items-center gap-2 text-xs text-[var(--text-secondary)] truncate hover:text-[var(--text-primary)] transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone size={12} />
                                    <span className="truncate">{contact.phone}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(contactsByLocation).length === 0 && (
                    <div className="text-center p-12 text-[var(--text-secondary)] italic">
                      No contacts found for this organization.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : selectedContact ? (
          <>
            {/* ... existing selectedContact view ... */}
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-light text-[var(--text-primary)] mb-1">{selectedContact.client_contact}</h1>
                  <p className="text-[var(--text-secondary)] text-sm uppercase tracking-wider mb-4">
                    {selectedContact.position} @ {selectedContact.client_organization}
                  </p>
                  <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
                    {selectedContact.phone && (
                      <a 
                        href={`tel:${selectedContact.phone}`}
                        className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Phone size={14} />
                        <span>{selectedContact.phone}</span>
                      </a>
                    )}
                    {selectedContact.email && (
                      <a 
                        href={`mailto:${selectedContact.email}`}
                        className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Mail size={14} />
                        <span>{selectedContact.email}</span>
                      </a>
                    )}
                    {selectedContact.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{selectedContact.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setContactForm(selectedContact); setIsContactModalOpen(true); }}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteContact(selectedContact.id)}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-rose-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Engagements */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                    <MessageSquare size={14} /> Engagements
                  </h3>
                  <button 
                    onClick={() => { setEngagementForm({ date: new Date().toISOString().split('T')[0], discussion: '' }); setIsEngagementModalOpen(true); }}
                    className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] px-3 py-1 rounded transition-colors"
                  >
                    + Add Log
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-4 bg-[var(--bg-tertiary)]/30 p-3 rounded border border-[var(--border)]">
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-2.5 text-[var(--text-secondary)]" />
                    <input 
                      type="text" 
                      placeholder="Search discussions..." 
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] pl-8 pr-2 py-2 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                      value={engagementSearch}
                      onChange={(e) => setEngagementSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] uppercase text-[var(--text-secondary)] font-mono">Filter by Date:</span>
                    <input 
                      type="date" 
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
                      value={engagementStartDate}
                      onChange={(e) => setEngagementStartDate(e.target.value)}
                    />
                    <span className="text-[var(--text-secondary)]">-</span>
                    <input 
                      type="date" 
                      className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
                      value={engagementEndDate}
                      onChange={(e) => setEngagementEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredEngagements.map(eng => (
                    <div key={eng.id} className="relative pl-6 border-l border-[var(--border)] pb-4 last:pb-0 group">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)]" />
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-[var(--text-secondary)] mb-1 block">{eng.date}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                          <button 
                            onClick={() => { setEngagementForm(eng); setIsEngagementModalOpen(true); }}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteEngagement(eng.id)}
                            className="text-[var(--text-secondary)] hover:text-rose-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{eng.discussion}</p>
                    </div>
                  ))}
                  {filteredEngagements.length === 0 && (
                    <p className="text-sm text-[var(--text-tertiary)] italic">
                      {engagements.length === 0 ? "No engagements recorded." : "No engagements match your filter."}
                    </p>
                  )}
                </div>
              </div>

              {/* Follow-ups */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                    <Bell size={14} /> Follow-ups
                  </h3>
                  <button 
                    onClick={() => { setFollowUpForm({ date: '', description: '' }); setIsFollowUpModalOpen(true); }}
                    className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] px-3 py-1 rounded transition-colors"
                  >
                    + Add Reminder
                  </button>
                </div>
                <div className="space-y-2">
                  {followUps.map(fu => (
                    <div key={fu.id} className={cn(
                      "flex items-center gap-3 p-3 rounded border transition-colors group",
                      fu.status === 'Done' ? "bg-[var(--bg-tertiary)] border-transparent opacity-60" : "bg-[var(--card-bg)] border-[var(--border)]"
                    )}>
                      <button 
                        onClick={() => toggleFollowUpStatus(fu)}
                        className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
                          fu.status === 'Done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                        )}
                      >
                        {fu.status === 'Done' && <User size={12} />} 
                      </button>
                      <div className="flex-1">
                        <p className={cn("text-sm", fu.status === 'Done' && "line-through")}>{fu.description}</p>
                        <span className={cn("text-xs font-mono", 
                          new Date(fu.date) < new Date() && fu.status !== 'Done' ? "text-rose-400" : "text-[var(--text-secondary)]"
                        )}>
                          Due: {fu.date}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                        <button 
                          onClick={() => { setFollowUpForm(fu); setIsFollowUpModalOpen(true); }}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteFollowUp(fu.id)}
                          className="text-[var(--text-secondary)] hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {followUps.length === 0 && <p className="text-sm text-[var(--text-tertiary)] italic">No follow-ups scheduled.</p>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <User size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select a contact to view details or click Map icon to view Org Chart</p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6">
            <h2 className="text-xl font-light mb-6">{contactForm.id ? 'Edit Contact' : 'New Contact'}</h2>
            <form onSubmit={handleSaveContact} className="space-y-4">
              <input 
                placeholder="Client / Organization" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={contactForm.client_organization || ''}
                onChange={e => setContactForm({...contactForm, client_organization: e.target.value})}
                required
              />
              <select 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm text-[var(--text-primary)]"
                value={contactForm.category || ''}
                onChange={e => setContactForm({...contactForm, category: e.target.value})}
              >
                <option value="">Select Category...</option>
                {companyTypes.map(type => (
                  <option key={type.id} value={type.name}>{type.name}</option>
                ))}
              </select>
              <input 
                placeholder="Contact Name" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={contactForm.client_contact || ''}
                onChange={e => setContactForm({...contactForm, client_contact: e.target.value})}
                required
              />
              <input 
                placeholder="Position" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={contactForm.position || ''}
                onChange={e => setContactForm({...contactForm, position: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Phone" 
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                  value={contactForm.phone || ''}
                  onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                />
                <input 
                  placeholder="Email" 
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                  value={contactForm.email || ''}
                  onChange={e => setContactForm({...contactForm, email: e.target.value})}
                />
              </div>
              <input 
                placeholder="Location" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={contactForm.location || ''}
                onChange={e => setContactForm({...contactForm, location: e.target.value})}
              />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 p-2 border border-[var(--border)] text-sm">Cancel</button>
                <button type="submit" className="flex-1 p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Engagement Modal */}
      {isEngagementModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6">
            <h2 className="text-xl font-light mb-6">{engagementForm.id ? 'Edit Log' : 'Log Engagement'}</h2>
            <form onSubmit={handleSaveEngagement} className="space-y-4">
              <input 
                type="date"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={engagementForm.date}
                onChange={e => setEngagementForm({...engagementForm, date: e.target.value})}
                required
              />
              <textarea 
                placeholder="What was discussed?" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm h-32"
                value={engagementForm.discussion}
                onChange={e => setEngagementForm({...engagementForm, discussion: e.target.value})}
                required
              />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setIsEngagementModalOpen(false)} className="flex-1 p-2 border border-[var(--border)] text-sm">Cancel</button>
                <button type="submit" className="flex-1 p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-md p-6">
            <h2 className="text-xl font-light mb-6">{followUpForm.id ? 'Edit Follow-up' : 'Set Follow-up'}</h2>
            <form onSubmit={handleSaveFollowUp} className="space-y-4">
              <input 
                type="date"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={followUpForm.date}
                onChange={e => setFollowUpForm({...followUpForm, date: e.target.value})}
                required
              />
              <input 
                placeholder="Description (e.g. Send proposal)" 
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] p-2 text-sm"
                value={followUpForm.description}
                onChange={e => setFollowUpForm({...followUpForm, description: e.target.value})}
                required
              />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setIsFollowUpModalOpen(false)} className="flex-1 p-2 border border-[var(--border)] text-sm">Cancel</button>
                <button type="submit" className="flex-1 p-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Engagement Search Modal */}
      {isRecentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] w-full max-w-2xl p-6 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light">GLOBAL ENGAGEMENT SEARCH</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleExportPDF}
                  disabled={recentEngagements.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-bold uppercase tracking-wider rounded hover:bg-[var(--text-secondary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export to PDF"
                >
                  <Download size={14} /> Export PDF
                </button>
                <button onClick={() => setIsRecentModalOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="relative mb-4 space-y-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input 
                  type="text" 
                  placeholder="Search all discussions..." 
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    fetchGlobalEngagements(e.target.value, globalStartDate, globalEndDate);
                  }}
                />
              </div>
              <div className="flex gap-2 items-center bg-[var(--bg-tertiary)]/50 p-2 rounded border border-[var(--border)]">
                <span className="text-xs font-mono text-[var(--text-secondary)] uppercase">Date Range:</span>
                <input 
                  type="date" 
                  className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
                  value={globalStartDate}
                  onChange={(e) => {
                    setGlobalStartDate(e.target.value);
                    fetchGlobalEngagements(globalSearch, e.target.value, globalEndDate);
                  }}
                />
                <span className="text-[var(--text-secondary)]">-</span>
                <input 
                  type="date" 
                  className="bg-[var(--bg-tertiary)] border border-[var(--border)] px-2 py-1 text-xs rounded focus:outline-none focus:border-[var(--text-primary)] text-[var(--text-primary)]"
                  value={globalEndDate}
                  onChange={(e) => {
                    setGlobalEndDate(e.target.value);
                    fetchGlobalEngagements(globalSearch, globalStartDate, e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {recentEngagements.map(eng => (
                <div key={eng.id} className="p-4 border border-[var(--border)] rounded bg-[var(--bg-tertiary)]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">{eng.client_contact}</h4>
                      <p className="text-xs text-[var(--text-secondary)]">{eng.client_organization}</p>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{eng.date}</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{eng.discussion}</p>
                </div>
              ))}
              {recentEngagements.length === 0 && (
                <div className="text-center py-10 text-[var(--text-secondary)]">
                  <p>No engagements found matching "{globalSearch}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
