const MarkdownView = ({ content }) => {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');

  return (
    <div style={{ color: '#D1D5DB', lineHeight: '1.8', fontSize: '15px' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('###')) {
          return (
            <h3 key={idx} style={{ color: '#818CF8', marginTop: '20px', marginBottom: '10px', fontSize: '18px' }}>
              {trimmed.replace(/^###\s*/, '')}
            </h3>
          );
        }

        if (trimmed.startsWith('##')) {
          return (
            <h2 key={idx} style={{ color: '#A5B4FC', marginTop: '24px', marginBottom: '12px', fontSize: '20px' }}>
              {trimmed.replace(/^##\s*/, '')}
            </h2>
          );
        }

        if (trimmed.startsWith('#')) {
          return (
            <h1 key={idx} style={{ color: '#FFFFFF', marginTop: '28px', marginBottom: '14px', fontSize: '22px' }}>
              {trimmed.replace(/^#\s*/, '')}
            </h1>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemContent = trimmed.substring(2);
          // Highlight bold tokens
          const parts = itemContent.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', marginLeft: '12px' }}>
              <span style={{ color: '#6366F1' }}>•</span>
              <div>
                {parts.map((p, pIdx) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return (
                      <strong key={pIdx} style={{ color: '#F3F4F6', fontWeight: 600 }}>
                        {p.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{p}</span>;
                })}
              </div>
            </div>
          );
        }

        if (trimmed.match(/^\d+\.\s/)) {
          const text = trimmed.replace(/^\d+\.\s*/, '');
          const parts = text.split(/(\*\*.*?\*\*)/g);
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', marginLeft: '12px' }}>
              <span style={{ color: '#818CF8', fontWeight: 'bold' }}>{trimmed.match(/^\d+\./)[0]}</span>
              <div>
                {parts.map((p, pIdx) => {
                  if (p.startsWith('**') && p.endsWith('**')) {
                    return (
                      <strong key={pIdx} style={{ color: '#F3F4F6', fontWeight: 600 }}>
                        {p.slice(2, -2)}
                      </strong>
                    );
                  }
                  return <span key={pIdx}>{p}</span>;
                })}
              </div>
            </div>
          );
        }

        if (trimmed === '') {
          return <div key={idx} style={{ height: '8px' }}></div>;
        }

        // Standard paragraph
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} style={{ marginBottom: '8px' }}>
            {parts.map((p, pIdx) => {
              if (p.startsWith('**') && p.endsWith('**')) {
                return (
                  <strong key={pIdx} style={{ color: '#F3F4F6', fontWeight: 600 }}>
                    {p.slice(2, -2)}
                  </strong>
                );
              }
              return <span key={pIdx}>{p}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownView;
