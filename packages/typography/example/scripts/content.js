/**
 * Demo content presets.
 *
 * Each entry is an HTML string that exercises h1-h6 and p tags
 * in a plausible reading context. All text is Ubuntu-themed.
 */
export const contentPresets = [
  {
    name: "Release announcement",
    html: `
      <h1>Ubuntu 26.04 LTS "Noble Numbat"</h1>
      <p>
        Canonical is proud to announce the release of Ubuntu 26.04 LTS,
        codenamed "Noble Numbat". This long-term support release will
        receive security updates and critical fixes for five years, with
        optional extended support available through Ubuntu Pro for an
        additional five years.
      </p>
      <h2>What's new in Noble Numbat</h2>
      <p>
        Ubuntu 26.04 ships with the GNOME 48 desktop, Linux kernel 6.12,
        and a fully refreshed installer experience. Performance
        improvements across the board mean faster boot times, reduced
        memory usage, and smoother animations on both x86 and ARM
        hardware.
      </p>
      <h3>Desktop experience</h3>
      <p>
        The new settings application has been redesigned from the ground
        up, offering a cleaner layout and faster access to common
        configuration tasks. Fractional scaling is now enabled by default
        on HiDPI displays, and the new tiling assistant makes window
        management effortless.
      </p>
      <h4>Snap improvements</h4>
      <p>
        Snap packages now start up to 40% faster thanks to a new
        compression pipeline and parallel mounting. The software centre
        surfaces richer metadata, including verified publisher badges and
        community ratings.
      </p>
      <h5>Accessibility enhancements</h5>
      <p>
        Screen reader support has been extended to cover all first-party
        applications. High-contrast themes are now generated dynamically
        from accent colour choices, and a new magnification mode
        supports smooth zooming with trackpad gestures.
      </p>
      <h6>Known issues</h6>
      <p>
        Bluetooth audio may require a manual reconnect after suspend on
        certain Realtek adapters. A fix is in progress and will be
        delivered via a stable release update within the first week.
      </p>
    `,
  },
  {
    name: "Server documentation",
    html: `
      <h1>Ubuntu Server Administration Guide</h1>
      <p>
        This guide covers the essential tasks for deploying and
        maintaining Ubuntu Server in production environments. Whether
        you are running a single machine or orchestrating hundreds of
        nodes, these best practices will help you build a reliable
        infrastructure.
      </p>
      <h2>Installation and initial setup</h2>
      <p>
        Ubuntu Server can be installed from a live ISO, deployed via
        MAAS for bare-metal provisioning, or launched as a cloud image
        on AWS, Azure, or Google Cloud. The recommended minimum is
        2 CPU cores, 4 GB of RAM, and 25 GB of disk.
      </p>
      <h3>Network configuration</h3>
      <p>
        Netplan is the default network configuration tool on Ubuntu
        Server. Configuration files live in
        <code>/etc/netplan/</code> and use YAML syntax. After editing
        a file, apply changes with <code>sudo netplan apply</code>.
        Static addresses, bonding, VLANs, and bridge interfaces are
        all supported declaratively.
      </p>
      <h4>Firewall with UFW</h4>
      <p>
        The Uncomplicated Firewall ships pre-installed but disabled.
        Enable it with <code>sudo ufw enable</code> and allow
        services by name: <code>sudo ufw allow OpenSSH</code>. For
        more complex rulesets, UFW can import iptables rules directly.
      </p>
      <h5>Automatic security updates</h5>
      <p>
        The <code>unattended-upgrades</code> package is enabled by
        default on Ubuntu Server LTS releases. It automatically
        installs security patches from the <code>-security</code>
        pocket, ensuring your systems stay protected between manual
        maintenance windows.
      </p>
      <h6>Further reading</h6>
      <p>
        For detailed reference material, visit the official Ubuntu
        Server documentation at ubuntu.com/server/docs or join the
        ubuntu-server mailing list for community discussion and
        support.
      </p>
    `,
  },
  {
    name: "Design system overview",
    html: `
      <h1>Vanilla Framework</h1>
      <p>
        Vanilla is Canonical's open-source CSS framework, built to
        bring consistency and clarity to Ubuntu's web presence. It
        provides a baseline grid, responsive utilities, and a curated
        set of patterns that scale from marketing pages to complex
        application interfaces.
      </p>
      <h2>Typography foundations</h2>
      <p>
        Good typography is the backbone of any design system.
        Vanilla's type scale is anchored to a baseline grid, ensuring
        that text across different sizes and weights aligns vertically.
        This creates a visual rhythm that makes long-form content
        easier to scan and more pleasant to read.
      </p>
      <h3>The baseline grid</h3>
      <p>
        Every element's line-height, padding, and margin are expressed
        as multiples of the baseline unit. When all vertical
        measurements snap to this grid, adjacent columns of text stay
        in register regardless of heading level or font size. The
        result is a page that feels composed rather than assembled.
      </p>
      <h4>Font metrics and nudging</h4>
      <p>
        Fonts do not sit neatly on the baseline by default. Each
        typeface has its own ascender, descender, and units-per-em
        values that determine where glyphs are drawn within the
        line box. A small "nudge" — calculated from these metrics —
        shifts each text element so that the first baseline of every
        block lands exactly on a grid line.
      </p>
      <h5>Working with custom fonts</h5>
      <p>
        To integrate a new typeface, extract its vertical metrics
        using the <code>extractFontData</code> CLI tool, then
        provide the ascender, descender, and unitsPerEm values as
        CSS custom properties on the root element. The baseline
        engine handles the rest.
      </p>
      <h6>Browser support</h6>
      <p>
        The nudge calculations rely on the CSS <code>mod()</code>
        function, which is supported in all evergreen browsers.
        Safari 17.4+, Chrome 125+, and Firefox 128+ have been
        tested and confirmed.
      </p>
    `,
  },
  {
    name: "Community article",
    html: `
      <h1>How Ubuntu changed the Linux landscape</h1>
      <p>
        When Mark Shuttleworth founded Canonical in 2004, desktop
        Linux was a patchwork of distributions aimed primarily at
        developers and system administrators. Ubuntu set out to change
        that by focusing relentlessly on the end-user experience,
        shipping a polished desktop with a predictable six-month
        release cadence.
      </p>
      <h2>The six-month promise</h2>
      <p>
        Every April and October, a new Ubuntu release arrives like
        clockwork. This rhythm gives hardware vendors and software
        developers a reliable target, while users get fresh packages
        without the instability of rolling releases. LTS versions,
        arriving every two years, anchor the ecosystem for enterprise
        and institutional users who prize stability above novelty.
      </p>
      <h3>Building a contributor community</h3>
      <p>
        Ubuntu's success rests on thousands of contributors who
        triage bugs, translate interfaces, test pre-releases, and
        write documentation. The Ubuntu Code of Conduct established
        norms of respectful collaboration that influenced open-source
        communities well beyond the project itself.
      </p>
      <h4>Local communities and events</h4>
      <p>
        LoCo teams — local community groups — organise release
        parties, install fests, and workshops in cities worldwide.
        These grassroots events introduce newcomers to free software
        and create the personal connections that sustain long-term
        contribution.
      </p>
      <h5>Ubuntu in education</h5>
      <p>
        Schools and universities across more than 190 countries run
        Ubuntu on classroom desktops and research clusters. The
        combination of zero licensing cost, extensive language support,
        and a vast repository of scientific software makes it a
        practical choice for institutions operating on tight budgets.
      </p>
      <h6>Looking ahead</h6>
      <p>
        Two decades in, Ubuntu continues to evolve. From IoT devices
        running Ubuntu Core to GPU workstations powering machine
        learning pipelines, the project's scope has expanded far
        beyond the desktop — but its founding principle remains: free
        software, made easy, for everyone.
      </p>
    `,
  },
];
