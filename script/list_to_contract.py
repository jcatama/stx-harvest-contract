import csv
import re

def normalize_url(url):
    # print(url)
    if url.startswith('ipfs://'):
        url = url.replace('ipfs://', 'https://stxnft.mypinata.cloud/ipfs/')
    elif url.startswith('ipfs/'):
        url = url.replace('ipfs/', 'https://stxnft.mypinata.cloud/ipfs/')
    
    url = re.sub(r'/(\d+)\.(\w+)', r'/{id}.\2', url)
    url = re.sub(r'/(\d+)(?=/|$)', '/{id}', url)
    
    return url

def main():
    input_file = 'input.txt'
    output_clar = 'output.clar'
    txt_lines = []
    clar_lines = []
    
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            contract_id = row['id'].strip()
            txt_lines.append(f"'{contract_id}',")
            clar_lines.append(f"(apprv '{contract_id})")
    
    with open(output_clar, 'w') as f:
        f.write('\n'.join(clar_lines) + '\n')
    
    print(f"Generated {output_clar} with {len(clar_lines)} approval lines")

if __name__ == '__main__':
    main()
