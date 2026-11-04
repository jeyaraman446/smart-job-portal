const Company = require('../models/Company');
const User = require('../models/User');
const { extractEmailDomain } = require('../utils/emailValidator');

exports.registerCompany = async (req, res) => {
  try {
    const hr = await User.findById(req.user.id);
    if (hr.company) {
      return res.status(400).json({ message: 'You have already registered a company' });
    }

    const {
      name,
      website,
      industry,
      size,
      location,
      logoUrl,
      description,
      taxId,
      idProofType,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const emailDomain = extractEmailDomain(hr.email);
    const idProofUrl = req.file ? req.file.path : undefined;
    const idProofFileName = req.file ? req.file.originalname : undefined;

    // Initial company creation
    const company = await Company.create({
      name: name.trim(),
      website: website ? website.trim() : '',
      industry: industry ? industry.trim() : '',
      size: size ? size.trim() : '',
      location: location ? location.trim() : '',
      logoUrl: logoUrl ? logoUrl.trim() : '',
      description: description ? description.trim() : '',
      registeredBy: hr._id,
      taxId: taxId ? taxId.trim() : undefined,
      companyEmailDomain: emailDomain,
      idProofUrl,
      idProofFileName,
      idProofType: idProofType || 'Certificate of Incorporation',
      verificationStatus: idProofUrl ? 'pending' : 'pending',
      verified: false,
    });

    hr.company = company._id;
    await hr.save();
    res.status(201).json(company);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'A company with this name is already registered' });
    res.status(500).json({ message: e.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const hr = await User.findById(req.user.id);
    if (!hr.company) return res.status(404).json({ message: 'No company registered' });

    const company = await Company.findById(hr.company);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const fields = ['name', 'website', 'industry', 'size', 'location', 'logoUrl', 'description', 'taxId', 'idProofType'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) company[f] = req.body[f];
    });

    if (req.file) {
      company.idProofUrl = req.file.path;
      company.idProofFileName = req.file.originalname;
      company.verificationStatus = 'pending';
      company.verified = false;
    }

    await company.save();
    res.json(company);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: 'A company with this name already exists' });
    res.status(500).json({ message: e.message });
  }
};

exports.uploadIdProof = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please attach a valid company ID proof document' });

    const hr = await User.findById(req.user.id);
    if (!hr.company) return res.status(404).json({ message: 'Register company profile first' });

    const company = await Company.findById(hr.company);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    company.idProofUrl = req.file.path;
    company.idProofFileName = req.file.originalname;
    if (req.body.idProofType) company.idProofType = req.body.idProofType;
    if (req.body.taxId) company.taxId = req.body.taxId.trim();

    company.verificationStatus = 'pending';
    company.verified = false;
    await company.save();

    res.json({
      message: 'Company ID proof uploaded successfully! Your verification is now under review.',
      company,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// Verification status toggle (admin action or self-verification demo toggle)
exports.verifyCompany = async (req, res) => {
  try {
    const hr = await User.findById(req.user.id);
    if (!hr.company) return res.status(404).json({ message: 'No company registered' });

    const company = await Company.findById(hr.company);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Toggle or set verification
    const targetStatus = req.body.status || (company.verified ? 'pending' : 'verified');
    company.verificationStatus = targetStatus;
    company.verified = targetStatus === 'verified';
    company.verifiedAt = targetStatus === 'verified' ? new Date() : null;
    company.verificationNotes = req.body.notes || (targetStatus === 'verified' ? 'Corporate identity & business registration proof validated.' : 'Pending documentation.');

    await company.save();
    res.json({
      message: `Company status updated to "${targetStatus}".`,
      company,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.getMyCompany = async (req, res) => {
  try {
    const hr = await User.findById(req.user.id).populate('company');
    res.json(hr.company || null);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
