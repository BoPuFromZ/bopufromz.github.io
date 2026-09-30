"""Build a continuous, rigged training character from MakeHuman's CC0 assets.

Run with the bundled Python (numpy required). Source data is downloaded once into
artifacts/character-references. MakeHuman program code is not used or bundled.
"""
import json, struct, hashlib, urllib.request
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/character-references'
SOURCE.mkdir(parents=True, exist_ok=True)
URL = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/'
FILES = {'base.obj': 'makehuman/data/3dobjs/base.obj', 'asian.target': 'makehuman/data/targets/macrodetails/asian-male-young.target', 'muscle.target': 'makehuman/data/targets/macrodetails/universal-male-young-maxmuscle-averageweight.target', 'average.target': 'makehuman/data/targets/macrodetails/universal-male-young-averagemuscle-averageweight.target', 'rig.json': 'makehuman/data/rigs/default.mhskel', 'weights.json': 'makehuman/data/rigs/default_weights.mhw', 'LICENSE.ASSETS.md': 'LICENSE.ASSETS.md'}
for file, remote in FILES.items():
    if not (SOURCE / file).exists(): urllib.request.urlretrieve(URL + remote, SOURCE / file)
lines = (SOURCE / 'base.obj').read_text(encoding='utf8').splitlines()
vertices = np.array([[float(x) for x in line.split()[1:4]] for line in lines if line.startswith('v ')])
source_uvs = np.array([[float(x) for x in line.split()[1:3]] for line in lines if line.startswith('vt ')])
for name, factor in [('asian.target', 1), ('muscle.target', .90), ('average.target', .10)]:
    for line in (SOURCE / name).read_text(encoding='utf8').splitlines():
        if not line or line.startswith('#'): continue
        parts = line.split(); vertices[int(parts[0])] += np.array([float(x) for x in parts[1:4]]) * factor
rig = json.loads((SOURCE / 'rig.json').read_text(encoding='utf8'))
weights = json.loads((SOURCE / 'weights.json').read_text(encoding='utf8'))['weights']
group = ''; triangles = []
for line in lines:
    if line.startswith('g '): group = line[2:]
    if line.startswith('f ') and group == 'body':
        face = [(int(p.split('/')[0]) - 1, int(p.split('/')[1]) - 1) for p in line.split()[1:]]
        for i in range(1, len(face) - 1): triangles.append([face[0], face[i + 1], face[i]])
used = sorted(set(i for tri in triangles for i in tri)); original_indices = np.array([v for v, _ in used]); uv_indices = np.array([uv for _, uv in used]); index_map = {v: i for i, v in enumerate(used)}
scale = 2.02 / (vertices[original_indices, 1].max() - vertices[original_indices, 1].min())
offset = np.array([0, -vertices[original_indices, 1].min(), 0]); vertices = (vertices + offset) * scale; vertices[:, 2] *= -1
def joint(name, end='head'):
    return vertices[rig['joints'][rig['bones'][name][end]]].mean(0)
hips = joint('root'); shoulders = joint('neck01'); hips[2] = .015; shoulders[2] = .015
refs = {'pelvis': [hips, hips + [0, .12, 0]], 'torso': [hips, shoulders], 'neck': [joint('neck01'), joint('head')], 'head': [joint('head'), joint('head', 'tail')]}
for side in ['L', 'R']:
    refs['arm.' + side] = [joint('upperarm01.' + side), joint('lowerarm01.' + side)]
    refs['forearm.' + side] = [joint('lowerarm01.' + side), joint('wrist.' + side)]
    refs['hand.' + side] = [joint('wrist.' + side), joint('finger3-1.' + side)]
    refs['thigh.' + side] = [joint('upperleg01.' + side), joint('lowerleg01.' + side)]
    refs['calf.' + side] = [joint('lowerleg01.' + side), joint('foot.' + side)]
    refs['foot.' + side] = [joint('foot.' + side), joint('foot.' + side, 'tail')]
    for finger in range(1, 6):
        for segment in range(1, 4):
            name = f'finger{finger}-{segment}.{side}'; refs[name] = [joint(name), joint(name, 'tail')]
names = list(refs); name_index = {n: i for i, n in enumerate(names)}
def collapse(name):
    side = name[-2:]
    if name.startswith('finger'): return name
    if name.startswith(('upperarm',)): return 'arm' + side
    if name.startswith('lowerarm'): return 'forearm' + side
    if name.startswith(('wrist', 'metacarpal')): return 'hand' + side
    if name.startswith('upperleg'): return 'thigh' + side
    if name.startswith('lowerleg'): return 'calf' + side
    if name.startswith(('foot', 'toe')): return 'foot' + side
    if name.startswith('neck'): return 'neck'
    if name in ['root', 'pelvis.L', 'pelvis.R', 'spine05', 'spine04']: return 'pelvis'
    if name.startswith(('spine', 'breast', 'clavicle', 'shoulder')): return 'torso'
    return 'head'
per_vertex = [{} for _ in vertices]
for name, entries in weights.items():
    group_index = name_index[collapse(name)]
    for vertex, weight in entries: per_vertex[vertex][group_index] = per_vertex[vertex].get(group_index, 0) + weight
skin_indices = np.zeros((len(used), 4), dtype='<u2'); skin_weights = np.zeros((len(used), 4), dtype='<f4')
for i, original in enumerate(original_indices):
    items = sorted(per_vertex[original].items(), key=lambda item: -item[1])[:4] or [(name_index['pelvis'], 1)]
    total = sum(w for _, w in items)
    for k, (bone, weight) in enumerate(items): skin_indices[i, k] = bone; skin_weights[i, k] = weight / total
positions = vertices[original_indices].astype('<f4'); uvs = source_uvs[uv_indices].astype('<f4'); indices = np.array([[index_map[i] for i in tri] for tri in triangles], dtype='<u2')
normals = np.zeros_like(positions)
face_normals = np.cross(positions[indices[:, 1]] - positions[indices[:, 0]], positions[indices[:, 2]] - positions[indices[:, 0]])
for k in range(3): np.add.at(normals, indices[:, k], face_normals)
normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-10)
def quaternion_y(direction):
    direction = direction / np.linalg.norm(direction); c = np.cross([0, 1, 0], direction); q = np.array([*c, 1 + direction[1]])
    if np.linalg.norm(q) < 1e-8: return np.array([1, 0, 0, 0])
    return q / np.linalg.norm(q)
def rotation(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
nodes = []; inverses = []
for name in names:
    a, b = refs[name]; q = quaternion_y(b - a); transform = np.eye(4); transform[:3, :3] = rotation(q); transform[:3, 3] = a
    inverses.append(np.linalg.inv(transform).T.reshape(16)); nodes.append({'name': name, 'translation': a.tolist(), 'rotation': q.tolist(), 'extras': {'referenceHead': a.tolist(), 'referenceTail': b.tolist()}})
materials = [
    {'name':'anime-skin', 'pbrMetallicRoughness':{'baseColorFactor':[.73,.47,.33,1],'metallicFactor':0,'roughnessFactor':.91}},
    {'name':'orange-gi', 'pbrMetallicRoughness':{'baseColorFactor':[.93,.205,.018,1],'metallicFactor':0,'roughnessFactor':.96}},
    {'name':'orange-training-pants', 'pbrMetallicRoughness':{'baseColorFactor':[.83,.155,.015,1],'metallicFactor':0,'roughnessFactor':.97}},
    {'name':'blue-boots', 'pbrMetallicRoughness':{'baseColorFactor':[.025,.065,.28,1],'metallicFactor':0,'roughnessFactor':.9}},
    {'name':'black-spiky-hair-base', 'pbrMetallicRoughness':{'baseColorFactor':[.008,.011,.018,1],'metallicFactor':0,'roughnessFactor':1}},
    {'name':'anime-hands', 'pbrMetallicRoughness':{'baseColorFactor':[.73,.47,.33,1],'metallicFactor':0,'roughnessFactor':.91}},
]
part_indices = [[] for _ in materials]
for tri in indices:
    p = positions[tri].mean(0); x,y,z = p
    # Body-region selection keeps the entire training outfit covered as joints move.
    mass = np.zeros(len(names))
    for vertex in tri:
        for bone, weight in zip(skin_indices[vertex], skin_weights[vertex]): mass[bone] += weight
    region = names[int(mass.argmax())]
    if region in ('torso', 'arm.L', 'arm.R'): part = 1
    elif region in ('pelvis', 'thigh.L', 'thigh.R', 'calf.L', 'calf.R'): part = 2
    elif region.startswith('foot.'): part = 3
    elif region.startswith(('hand.', 'finger')): part = 5
    else: part = 0
    # The skin atlas has a bare scalp. Paint a short, asymmetric cropped style
    # over the crown while leaving a natural forehead and visible eyebrows.
    hairline = 1.955 + .012 * x + .008 * np.sin(19 * x)
    if region == 'head' and ((y > hairline and z < .005) or (y > 1.895 and z >= .005)): part = 4
    part_indices[part].append(tri)
blob = bytearray(); views = []; accessors = []
def accessor(array, component, kind, bounds=False):
    while len(blob)%4: blob.append(0)
    array = np.ascontiguousarray(array); start = len(blob); blob.extend(array.tobytes()); views.append({'buffer':0,'byteOffset':start,'byteLength':array.nbytes})
    entry = {'bufferView':len(views)-1,'componentType':component,'count':len(array),'type':kind}
    if bounds: entry.update(min=array.min(0).tolist(),max=array.max(0).tolist())
    accessors.append(entry); return len(accessors)-1
attributes = {'POSITION':accessor(positions,5126,'VEC3',True),'NORMAL':accessor(normals.astype('<f4'),5126,'VEC3'),'JOINTS_0':accessor(skin_indices,5123,'VEC4'),'WEIGHTS_0':accessor(skin_weights,5126,'VEC4')}
primitives = [{'attributes':attributes,'indices':accessor(np.array(part,dtype='<u2').reshape(-1),5123,'SCALAR'),'material':i} for i,part in enumerate(part_indices) if part]
bind = accessor(np.array(inverses,dtype='<f4'),5126,'MAT4')
root_index = len(nodes); nodes.append({'name':'NaturalAthlete','children':list(range(root_index))+[root_index+1], 'extras':{'eyes':[joint('eye.L').tolist(),joint('eye.R').tolist()], 'source':'MakeHuman CC0'}}); nodes.append({'name':'ContinuousHumanMesh','mesh':0,'skin':0})
gltf = {'asset':{'version':'2.0','generator':'AFTERHOURS / MakeHuman CC0 anime athlete builder'},'scene':0,'scenes':[{'nodes':[root_index]}],'nodes':nodes,'skins':[{'joints':list(range(root_index)),'inverseBindMatrices':bind}],'meshes':[{'primitives':primitives}],'materials':materials,'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':accessors}
json_bytes = json.dumps(gltf,separators=(',',':')).encode(); json_bytes += b' ' * (-len(json_bytes)%4); blob += b'\0' * (-len(blob)%4)
result = struct.pack('<III',0x46546c67,2,12+8+len(json_bytes)+8+len(blob))+struct.pack('<II',len(json_bytes),0x4e4f534a)+json_bytes+struct.pack('<II',len(blob),0x004e4942)+blob
output = ROOT/'public/models'; output.mkdir(parents=True,exist_ok=True); (output/'fitness-athlete.glb').write_bytes(result); (output/'MAKEHUMAN-LICENSE.md').write_text((SOURCE/'LICENSE.ASSETS.md').read_text(encoding='utf8'),encoding='utf8')
credits={'source':'https://github.com/makehumancommunity/makehuman','license':'CC0-1.0','authors':'MakeHuman Team / Data Collection AB, Joel Palmius, Jonas Hauquier','modifications':'Adult male athletic morphology, collapsed deformation rig, orange martial-arts outfit colors, original runtime hair, accessories and deadlift poses','source_sha256':{name:hashlib.sha256((SOURCE/name).read_bytes()).hexdigest() for name in FILES},'vertices':len(positions),'triangles':len(indices)}
(output/'fitness-athlete-source.json').write_text(json.dumps(credits,indent=2)+'\n',encoding='utf8')
print(json.dumps({'bytes':len(result),'vertices':len(positions),'triangles':len(indices),'bones':len(names),'hip':hips.tolist(),'shoulders':shoulders.tolist(),'eyes':[joint('eye.L').tolist(),joint('eye.R').tolist()]}))

