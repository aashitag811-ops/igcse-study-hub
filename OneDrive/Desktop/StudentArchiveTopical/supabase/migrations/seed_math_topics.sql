-- ============================================================
-- seed_math_topics.sql
-- Seeds Mathematics Extended (0580) taxonomy into topics table.
-- Run in Supabase SQL Editor after the theory_questions migration.
-- ============================================================

insert into public.topics (subject_code, topic, subtopic) values
  -- 1. Number
  ('0580', 'Number', 'Number Basics and Calculations'),
  ('0580', 'Number', 'Fractions, Decimals and Percentages'),
  ('0580', 'Number', 'Powers, Roots and Standard Form'),
  ('0580', 'Number', 'Indices and Surds'),
  ('0580', 'Number', 'Ratio and Proportion'),
  ('0580', 'Number', 'Time and Money'),
  ('0580', 'Number', 'Rounding, Estimation and Bounds'),
  ('0580', 'Number', 'Exponential Growth and Decay'),

  -- 2. Algebra and Graphs
  ('0580', 'Algebra and Graphs', 'Algebraic Manipulation and Factorisation'),
  ('0580', 'Algebra and Graphs', 'Algebraic Fractions'),
  ('0580', 'Algebra and Graphs', 'Equations and Inequalities'),
  ('0580', 'Algebra and Graphs', 'Sequences'),
  ('0580', 'Algebra and Graphs', 'Proportion'),
  ('0580', 'Algebra and Graphs', 'Graphs and Curves'),
  ('0580', 'Algebra and Graphs', 'Differentiation'),
  ('0580', 'Algebra and Graphs', 'Functions'),

  -- 3. Coordinate Geometry
  ('0580', 'Coordinate Geometry', 'Equations of Linear Graphs'),
  ('0580', 'Coordinate Geometry', 'Parallel Lines'),
  ('0580', 'Coordinate Geometry', 'Perpendicular Lines'),

  -- 4. Geometry
  ('0580', 'Geometry', 'Constructions and Nets'),
  ('0580', 'Geometry', 'Scale Drawings and Bearings'),
  ('0580', 'Geometry', 'Similarity'),
  ('0580', 'Geometry', 'Symmetry'),
  ('0580', 'Geometry', 'Angles and Polygons'),
  ('0580', 'Geometry', 'Circle Theorems'),

  -- 5. Mensuration
  ('0580', 'Mensuration', 'Area and Perimeter — 2D Shapes'),
  ('0580', 'Mensuration', 'Circles, Arcs and Sectors'),
  ('0580', 'Mensuration', 'Surface Area and Volume — 3D Shapes'),

  -- 6. Trigonometry
  ('0580', 'Trigonometry', 'Pythagoras and Right-Angled Triangles'),
  ('0580', 'Trigonometry', 'Sine and Cosine Rules'),
  ('0580', 'Trigonometry', 'Angles of Elevation and Depression'),

  -- 7. Transformations
  ('0580', 'Transformations', 'Transformations'),

  -- 8. Vectors
  ('0580', 'Vectors', 'Vector Operations'),
  ('0580', 'Vectors', 'Vector Geometry'),

  -- 9. Probability
  ('0580', 'Probability', 'Venn Diagrams'),
  ('0580', 'Probability', 'Independent Events and Conditional Probability'),

  -- 10. Statistics
  ('0580', 'Statistics', 'Statistical Diagrams'),
  ('0580', 'Statistics', 'Scatter Diagrams'),
  ('0580', 'Statistics', 'Cumulative Frequency'),
  ('0580', 'Statistics', 'Histograms')
on conflict (subject_code, topic, subtopic) do nothing;
