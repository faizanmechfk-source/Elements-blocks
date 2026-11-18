(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const ELEMENTS = ['fire', 'water', 'earth', 'air'];

  const SHAPE_TEMPLATES = [
    // Single
    { id: 'dot_1', name: 'Spark', weight: 10, cells: [[0, 0]] },

    // 2-cell lines
    { id: 'line_2h', name: 'Duo H', weight: 11, cells: [[0, 0], [0, 1]] },
    { id: 'line_2v', name: 'Duo V', weight: 11, cells: [[0, 0], [1, 0]] },

    // 3-cell lines
    { id: 'line_3h', name: 'Trio H', weight: 10, cells: [[0, 0], [0, 1], [0, 2]] },
    { id: 'line_3v', name: 'Trio V', weight: 10, cells: [[0, 0], [1, 0], [2, 0]] },

    // 4-cell lines
    { id: 'line_4h', name: 'Quad H', weight: 7, cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'line_4v', name: 'Quad V', weight: 7, cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },

    // 5-cell lines
    { id: 'line_5h', name: 'Penta H', weight: 4, cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 'line_5v', name: 'Penta V', weight: 4, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },

    // Squares
    { id: 'sq_2', name: 'Cube', weight: 10, cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    {
      id: 'sq_3',
      name: 'Titan Cube',
      weight: 4,
      cells: [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 1], [1, 2],
        [2, 0], [2, 1], [2, 2]
      ]
    },

    // Small 2x2 corners
    { id: 'corner_tl', name: 'Corner TL', weight: 8, cells: [[0, 0], [0, 1], [1, 0]] },
    { id: 'corner_tr', name: 'Corner TR', weight: 8, cells: [[0, 0], [0, 1], [1, 1]] },
    { id: 'corner_bl', name: 'Corner BL', weight: 8, cells: [[0, 0], [1, 0], [1, 1]] },
    { id: 'corner_br', name: 'Corner BR', weight: 8, cells: [[0, 1], [1, 0], [1, 1]] },

    // L shapes
    { id: 'l_up', name: 'L Shape', weight: 6, cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: 'l_right', name: 'L Right', weight: 6, cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
    { id: 'l_down', name: 'L Down', weight: 6, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    { id: 'l_left', name: 'L Left', weight: 6, cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },

    // Reverse L (J) shapes
    { id: 'rev_l_up', name: 'Reverse L', weight: 6, cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
    { id: 'rev_l_right', name: 'Reverse L R', weight: 6, cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
    { id: 'rev_l_down', name: 'Reverse L D', weight: 6, cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
    { id: 'rev_l_left', name: 'Reverse L L', weight: 6, cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },

    // Big 3x3 Corners
    { id: 'big_corner_1', name: 'Big Corner 1', weight: 4, cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { id: 'big_corner_2', name: 'Big Corner 2', weight: 4, cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },

    // T shapes
    { id: 't_down', name: 'T Down', weight: 6, cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 't_up', name: 'T Up', weight: 6, cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
    { id: 't_right', name: 'T Right', weight: 6, cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
    { id: 't_left', name: 'T Left', weight: 6, cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },

    // S & Z shapes
    { id: 's_h', name: 'S Shape', weight: 5, cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
    { id: 's_v', name: 'S Vert', weight: 5, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { id: 'z_h', name: 'Z Shape', weight: 5, cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { id: 'z_v', name: 'Z Vert', weight: 5, cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },

    // Irregular shapes
    { id: 'irr_diag_2', name: 'Twin Step', weight: 4, cells: [[0, 0], [1, 1]] },
    { id: 'irr_plus', name: 'Element Cross', weight: 3, cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { id: 'irr_u', name: 'Bridge', weight: 3, cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] }
  ];

  function buildShape(template, element) {
    let maxR = 0;
    let maxC = 0;
    template.cells.forEach(([r, c]) => {
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    });
    return {
      id: template.id,
      name: template.name,
      cells: template.cells.map(([r, c]) => [r, c]),
      width: maxC + 1,
      height: maxR + 1,
      element: element || ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]
    };
  }

  function pickWeightedTemplate(pool) {
    const total = pool.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function generateTray(boardObj) {
    const pieces = [];
    let largeCount = 0;

    for (let i = 0; i < 3; i++) {
      let pool = SHAPE_TEMPLATES;
      if (largeCount >= 1) {
        pool = SHAPE_TEMPLATES.filter((t) => t.cells.length <= 4);
      }

      let chosen = null;
      if (boardObj && i === 2) {
        // Ensure balanced playability: verify at least one piece in the tray fits if any template fits
        const anyAlreadyFits = pieces.some((p) => boardObj.canPieceFitAnywhere(p));
        if (!anyAlreadyFits) {
          const fittingTemplates = SHAPE_TEMPLATES.filter((t) =>
            boardObj.canPieceFitAnywhere(buildShape(t, 'fire'))
          );
          if (fittingTemplates.length > 0) {
            chosen = pickWeightedTemplate(fittingTemplates);
          }
        }
      }

      if (!chosen) {
        chosen = pickWeightedTemplate(pool);
      }
      if (chosen.cells.length >= 5) largeCount++;

      const el = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
      pieces.push(buildShape(chosen, el));
    }

    return pieces;
  }

  EB.Shapes = {
    ELEMENTS,
    TEMPLATES: SHAPE_TEMPLATES,
    buildShape,
    generateTray
  };
})(window);
